"""
tests/test_mock_interviewer.py
单元测试：11_模拟面试官.py 的纯逻辑函数（不调用 API，不依赖 ChromaDB）

策略：在 import 之前把所有外部依赖注入 sys.modules，让主模块加载
      时拿到 mock 对象，而非真实库。测试完全离线，无需 .env 或网络。

运行：python3 -m pytest rag/code/tests/ -v
"""

import importlib.util
import json
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from contextlib import contextmanager

# ══════════════════════════════════════════════════════════════
# 在 module 级别 patch sys.modules，阻断所有外部依赖
# ══════════════════════════════════════════════════════════════

def _make_chromadb_stub():
    stub = MagicMock(name="chromadb")
    stub.PersistentClient.return_value.get_or_create_collection.return_value = MagicMock(
        count=MagicMock(return_value=10),
        metadata={"kb_version": "v2_header_split"},
        query=MagicMock(return_value={
            "documents": [[]], "metadatas": [[]], "distances": [[]]
        }),
    )
    return stub


def _make_langchain_stub():
    stub = MagicMock(name="langchain_text_splitters")

    class FakeDoc:
        def __init__(self, text, meta):
            self.page_content = text
            self.metadata = meta

    stub.HTMLHeaderTextSplitter.return_value.split_text.return_value = [
        FakeDoc("sample text", {"h1": "Title"})
    ]
    stub.RecursiveCharacterTextSplitter.return_value.split_text.side_effect = lambda t: [t]
    return stub


def _make_openai_stub():
    stub = MagicMock(name="openai")
    return stub


def _make_prompt_toolkit_stub():
    pt = MagicMock(name="prompt_toolkit")
    pt.prompt = MagicMock(return_value="test input")
    pt.history = MagicMock()
    pt.history.InMemoryHistory = MagicMock
    return pt


def _patch_sys_modules():
    """注入 stub，阻断真实 import"""
    stubs = {
        "chromadb":                          _make_chromadb_stub(),
        "langchain_text_splitters":          _make_langchain_stub(),
        "openai":                            _make_openai_stub(),
        "openai.PermissionDeniedError":      type("PermissionDeniedError", (Exception,), {}),
        "numpy":                             MagicMock(name="numpy"),
        "prompt_toolkit":                    _make_prompt_toolkit_stub(),
        "prompt_toolkit.history":            MagicMock(),
    }
    for name, stub in stubs.items():
        sys.modules.setdefault(name, stub)
    return stubs


_patch_sys_modules()


# ── provider 模块 stub（替换 spec_from_file_location 加载的真实文件）──────────

def _make_provider_stub():
    import numpy as _np  # noqa — 已经是 mock
    mod = types.ModuleType("rag_provider")
    mod.embed      = lambda text: MagicMock(__iter__=lambda s: iter([0.0] * 768), tolist=lambda: [0.0]*768)
    mod.model_info = lambda: {"provider": "test", "chat_model": "test-model"}
    mod.get_config = lambda: {"chat_model": "test-model", "sdk": "openai"}
    mod._get_client = lambda: MagicMock()
    return mod


_PROVIDER_STUB = _make_provider_stub()


# ══════════════════════════════════════════════════════════════
# Fixture：加载主模块（scope=session，只加载一次）
# ══════════════════════════════════════════════════════════════

@pytest.fixture(scope="session")
def mi():
    """
    用 exec 方式加载 11_模拟面试官.py，同时 patch 掉 provider 文件加载。
    返回 namespace（SimpleNamespace），用法与 module 相同。
    """
    src_path = Path(__file__).parent.parent / "11_模拟面试官.py"
    source   = src_path.read_text(encoding="utf-8")

    ns: dict = {"__file__": str(src_path), "__name__": "__test__"}

    fake_spec = MagicMock()
    fake_spec.loader = MagicMock()

    with patch("importlib.util.spec_from_file_location", return_value=fake_spec), \
         patch("importlib.util.module_from_spec", return_value=_PROVIDER_STUB):
        exec(compile(source, str(src_path), "exec"), ns)  # noqa: S102

    # 保留原始 namespace dict，供 patch_ns 使用
    ns_obj = types.SimpleNamespace(**ns)
    ns_obj.__ns__ = ns   # 存储原始 dict，以便直接 patch globals
    return ns_obj


@contextmanager
def patch_ns(mi, **kwargs):
    """
    临时修改 exec 生成的 namespace（即函数的 __globals__）。
    patch.object(SimpleNamespace) 只改属性，函数仍读自己的 __globals__，
    必须直接改 ns dict 才能生效。
    """
    ns = mi.__ns__
    old = {k: ns[k] for k in kwargs if k in ns}
    ns.update(kwargs)
    try:
        yield
    finally:
        for k in kwargs:
            if k in old:
                ns[k] = old[k]
            else:
                ns.pop(k, None)


# ══════════════════════════════════════════════════════════════
# 1. _extract_json
# ══════════════════════════════════════════════════════════════

class TestExtractJson:
    def test_bare_json(self, mi):
        assert mi._extract_json('{"score": 3}') == {"score": 3}

    def test_code_fenced_with_lang(self, mi):
        assert mi._extract_json('```json\n{"x": 1}\n```') == {"x": 1}

    def test_code_fenced_no_lang(self, mi):
        assert mi._extract_json('```\n{"ok": true}\n```') == {"ok": True}

    def test_invalid_returns_none(self, mi):
        assert mi._extract_json("这不是 JSON") is None

    def test_empty_returns_none(self, mi):
        assert mi._extract_json("") is None

    def test_whitespace_stripped(self, mi):
        assert mi._extract_json('  {"x": 1}  ') == {"x": 1}


# ══════════════════════════════════════════════════════════════
# 2. chunk_by_sentence
# ══════════════════════════════════════════════════════════════

class TestChunkBySentence:
    def test_basic_split(self, mi):
        # 每句需要 > 5 字才不被初筛过滤，拼合后 > 20 字才保留为 chunk
        text = "这是第一个完整的测试句子，用于验证分块逻辑。这是第二个完整的测试句子，同样用于验证。"
        chunks = mi.chunk_by_sentence(text)
        assert len(chunks) >= 1
        assert all(isinstance(c, str) for c in chunks)

    def test_long_text_splits_multiple(self, mi):
        sentence = "这是一个较长的测试句子，用来验证分块逻辑是否正常工作。"
        chunks = mi.chunk_by_sentence(sentence * 30, max_chars=100)
        assert len(chunks) > 1

    def test_short_chunks_filtered(self, mi):
        chunks = mi.chunk_by_sentence("短。")
        assert all(len(c) > 20 for c in chunks)

    def test_empty_text(self, mi):
        assert mi.chunk_by_sentence("") == []


# ══════════════════════════════════════════════════════════════
# 3. _build_eval_prompt
# ══════════════════════════════════════════════════════════════

@pytest.fixture
def sample_qa():
    return {
        "question":         "什么是 RAG？",
        "reference_answer": "检索增强生成。",
        "key_points":       ["检索相关文档", "注入 prompt", "LLM 生成回答"],
    }


class TestBuildEvalPrompt:
    def test_contains_question(self, mi, sample_qa):
        assert "什么是 RAG？" in mi._build_eval_prompt(sample_qa, "回答")

    def test_contains_all_key_points(self, mi, sample_qa):
        prompt = mi._build_eval_prompt(sample_qa, "回答")
        for kp in sample_qa["key_points"]:
            assert kp in prompt

    def test_max_score_annotation(self, mi, sample_qa):
        prompt = mi._build_eval_prompt(sample_qa, "回答")
        assert "3" in prompt   # len(key_points) == 3

    def test_user_answer_included(self, mi, sample_qa):
        prompt = mi._build_eval_prompt(sample_qa, "候选人的具体回答")
        assert "候选人的具体回答" in prompt


# ══════════════════════════════════════════════════════════════
# 4. evaluate_answer_multi — 聚合逻辑
# ══════════════════════════════════════════════════════════════

def _mock_eval(score, model="m"):
    return {
        "score": score, "max_score": 4,
        "key_points_hit": [], "key_points_missed": [],
        "errors": [], "analysis": [], "feedback": "",
        "model": model,
    }


class TestEvaluateAnswerMulti:
    def test_failed_models_excluded_from_avg(self, mi, sample_qa):
        """score=-1 不计入均值：(3+1)/2 = 2.0"""
        side_effects = [_mock_eval(3, "a"), _mock_eval(-1, "b"), _mock_eval(1, "c")]
        with patch_ns(mi, EVAL_MODELS=["a", "b", "c"],
                      _evaluate_with_model=MagicMock(side_effect=side_effects)):
            out = mi.evaluate_answer_multi(sample_qa, "回答")
        assert out["score"] == 2.0

    def test_all_failed_returns_zero(self, mi, sample_qa):
        side_effects = [_mock_eval(-1, f"m{i}") for i in range(3)]
        with patch_ns(mi, EVAL_MODELS=["m0", "m1", "m2"],
                      _evaluate_with_model=MagicMock(side_effect=side_effects)):
            out = mi.evaluate_answer_multi(sample_qa, "回答")
        assert out["score"] == 0

    def test_model_evals_includes_all(self, mi, sample_qa):
        """model_evals 保留全部结果（含失败的），不过滤"""
        side_effects = [_mock_eval(2, "good"), _mock_eval(-1, "bad")]
        with patch_ns(mi, EVAL_MODELS=["good", "bad"],
                      _evaluate_with_model=MagicMock(side_effect=side_effects)):
            out = mi.evaluate_answer_multi(sample_qa, "回答")
        assert len(out["model_evals"]) == 2

    def test_single_model_passthrough(self, mi, sample_qa):
        with patch_ns(mi, EVAL_MODELS=["only"],
                      _evaluate_with_model=MagicMock(side_effect=[_mock_eval(3)])):
            out = mi.evaluate_answer_multi(sample_qa, "回答")
        assert out["score"] == 3.0


# ══════════════════════════════════════════════════════════════
# 5. _evaluate_with_model — API 异常处理
# ══════════════════════════════════════════════════════════════

@pytest.fixture
def minimal_qa():
    return {
        "question": "test", "reference_answer": "ref",
        "key_points": ["p1", "p2"],
    }


class TestEvaluateWithModel:
    def test_timeout_returns_error_result(self, mi, minimal_qa):
        with patch.object(mi._client.chat.completions, "create",
                          side_effect=TimeoutError("timed out")):
            result = mi._evaluate_with_model(minimal_qa, "回答", "model-x")
        assert result["score"] == -1
        assert "error" in result

    def test_generic_exception_returns_error(self, mi, minimal_qa):
        with patch.object(mi._client.chat.completions, "create",
                          side_effect=Exception("conn error")):
            result = mi._evaluate_with_model(minimal_qa, "回答", "model-x")
        assert result["score"] == -1
        assert result["model"] == "model-x"

    def test_non_json_response_score_zero(self, mi, minimal_qa):
        mock_resp = MagicMock()
        mock_resp.choices[0].message.content = "无法评估。"
        with patch.object(mi._client.chat.completions, "create",
                          return_value=mock_resp):
            result = mi._evaluate_with_model(minimal_qa, "回答", "model-x")
        assert result["score"] == 0
        assert "无法评估" in result["feedback"]

    def test_valid_json_response(self, mi, minimal_qa):
        payload = {
            "score": 2, "max_score": 2, "analysis": [], "errors": [],
            "key_points_hit": ["p1", "p2"], "key_points_missed": [],
            "feedback": "不错",
        }
        mock_resp = MagicMock()
        mock_resp.choices[0].message.content = json.dumps(payload)
        with patch.object(mi._client.chat.completions, "create",
                          return_value=mock_resp):
            result = mi._evaluate_with_model(minimal_qa, "回答", "model-x")
        assert result["score"] == 2
        assert result["model"] == "model-x"


# ══════════════════════════════════════════════════════════════
# 6. load_qa_dataset — 难度排序
# ══════════════════════════════════════════════════════════════

class TestLoadQaDataset:
    def test_difficulty_order(self, mi, tmp_path):
        qa_data = [
            {"id": "h", "difficulty": "hard",   "topic": "rag",
             "question": "q", "key_points": [], "reference_answer": ""},
            {"id": "e", "difficulty": "easy",   "topic": "rag",
             "question": "q", "key_points": [], "reference_answer": ""},
            {"id": "m", "difficulty": "medium", "topic": "rag",
             "question": "q", "key_points": [], "reference_answer": ""},
        ]
        qa_file = tmp_path / "qa.json"
        qa_file.write_text(json.dumps(qa_data, ensure_ascii=False))

        with patch_ns(mi, QA_PATH=qa_file):
            # shuffle=True 才会按 easy→medium→hard 分桶排序；每桶只有 1 题，无随机性
            result = mi.load_qa_dataset(shuffle=True)

        diffs = [q["difficulty"] for q in result]
        assert diffs.index("easy") < diffs.index("medium") < diffs.index("hard")

    def test_missing_file_returns_empty(self, mi, tmp_path):
        with patch_ns(mi, QA_PATH=tmp_path / "nonexistent.json"):
            result = mi.load_qa_dataset()
        assert result == []
