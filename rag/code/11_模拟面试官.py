#!/usr/bin/env python3
"""
11_模拟面试官.py — 基于 ai-handbook 知识库的文字版模拟面试官
=====================================
首次运行：扫描 ai-handbook 内容文件 → 向量化 → 存入 ChromaDB
后续运行：直接加载已有知识库 → 开始面试

面试官能力：
  - 检索 ai-handbook 知识库出题（RAG / MCP / Agent）
  - 根据候选人回答追问，调用知识库核实答案
  - 每 5 轮给出阶段性评分（满分 10 分）和改进建议
  - 全程保留对话历史，面试官记得每一轮的问答

依赖：pip install chromadb openai numpy python-dotenv
运行：python 11_模拟面试官.py
退出：Ctrl+C
"""

# ╔══════════════════════════════════════════════════════════════╗
# ║  📺 配置说明                                                  ║
# ║  - 使用 .env 中的 PROVIDER 配置（同其他脚本）                ║
# ║  - 需要 Tool Calling 支持                                    ║
# ║    推荐：siliconflow（Qwen2.5-72B）/ openai                  ║
# ║    不推荐：zhipu（Tool Calling 接口与 OpenAI 有差异）         ║
# ╚══════════════════════════════════════════════════════════════╝

import json
import re
from html.parser import HTMLParser
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

try:
    import chromadb
except ImportError:
    raise ImportError("请先安装：pip install chromadb")

import numpy as np  # noqa: F401（embed() 返回 np.ndarray，需要 import）

# ── 加载 Provider 接口 ───────────────────────────────────────
_provider_path = Path(__file__).with_name("00_配置提供商_先改这个.py")
_provider_spec = spec_from_file_location("rag_provider", _provider_path)
if _provider_spec is None or _provider_spec.loader is None:
    raise ImportError(f"无法加载提供商配置文件: {_provider_path}")
_provider_module = module_from_spec(_provider_spec)
_provider_spec.loader.exec_module(_provider_module)

embed      = _provider_module.embed
model_info = _provider_module.model_info
_cfg       = _provider_module.get_config()
_client    = _provider_module._get_client()


# ══════════════════════════════════════════════════════════════
# 知识库配置
# ══════════════════════════════════════════════════════════════

# rag/code/ → rag/ → ai-handbook/
HANDBOOK_ROOT   = Path(__file__).parent.parent.parent
DB_PATH         = Path(__file__).parent / "interview_kb"
COLLECTION_NAME = "ai_handbook"

# 明确列出高价值文件，跳过纯导航/索引页
_EXPLICIT_SOURCES = [
    ("rag",   "rag/docs/rag-5d.html"),                              # 综合 Q&A，质量最高
    ("rag",   "rag/docs/01_理解RAG.html"),                          # 原理讲解
    ("rag",   "rag/docs/02_概念手册_向量与检索.html"),               # 技术深度
    ("rag",   "rag/docs/03_代码讲解_V1V2.html"),                    # 代码理解
    ("rag",   "rag/docs/04_工程方法论手册.html"),                    # 工程实践
    ("mcp",   "mcp/05-interview/qa.md"),                            # MCP 面试题库
    ("mcp",   "mcp/05-interview/common-misconceptions.md"),         # MCP 常见误解
    ("mcp",   "mcp/02-core-concepts/function-calling.md"),          # MCP 核心概念
    ("mcp",   "mcp/02-core-concepts/tools-resources-prompts.md"),   # MCP 核心概念
    ("agent", "agent/agent-5d-v3.html"),                            # Agent 框架
]

def _build_kb_sources() -> list[tuple[str, Path]]:
    sources = []
    for topic, rel in _EXPLICIT_SOURCES:
        p = HANDBOOK_ROOT / rel
        if p.exists():
            sources.append((topic, p))
    # 面试题库（全部 mock-interview/*.md）
    mock_dir = HANDBOOK_ROOT / "rag/code/mock-interview"
    for md in sorted(mock_dir.glob("*.md")):
        sources.append(("interview", md))
    return sources

KB_SOURCES = _build_kb_sources()


# ══════════════════════════════════════════════════════════════
# HTML 文本提取（标准库 html.parser，无需安装）
#
# 剥离 <script> / <style> / <nav> / <button> 标签及其内容，
# 只保留正文文本节点（长度 ≥ TEXT_MIN_LEN，过滤 UI 噪音）。
# ══════════════════════════════════════════════════════════════

TEXT_MIN_LEN = 30   # 低于此长度的文本节点视为 UI 噪音（如 tab 按钮标签）


class _TextExtractor(HTMLParser):
    _SKIP_TAGS = {"script", "style", "nav", "button", "head"}

    def __init__(self):
        super().__init__()
        self._skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in self._SKIP_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag in self._SKIP_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data):
        if self._skip_depth == 0:
            text = data.strip()
            if len(text) >= TEXT_MIN_LEN:
                self.parts.append(text)


def extract_html_text(path: Path) -> str:
    extractor = _TextExtractor()
    extractor.feed(path.read_text(encoding="utf-8", errors="replace"))
    return "\n".join(extractor.parts)


# ══════════════════════════════════════════════════════════════
# 分块（复用 v3 的句子感知分块策略）
# ══════════════════════════════════════════════════════════════

def chunk_by_sentence(text: str, max_chars: int = 300) -> list[str]:
    sentences = re.split(r'(?<=[。！？；\n])', text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s) > 5]
    chunks, current = [], ""
    for s in sentences:
        if len(current) + len(s) <= max_chars:
            current += s
        else:
            if current:
                chunks.append(current.strip())
            current = s
    if current.strip():
        chunks.append(current.strip())
    return [c for c in chunks if len(c) > 20]


# ══════════════════════════════════════════════════════════════
# 知识库构建与加载（ChromaDB 持久化）
# ══════════════════════════════════════════════════════════════

def _get_collection():
    """创建或加载 ChromaDB Collection（持久化到磁盘）"""
    client = chromadb.PersistentClient(path=str(DB_PATH))
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def get_or_build_kb():
    """
    首次运行：扫描 ai-handbook 文件 → 向量化 → upsert 到 ChromaDB
    后续运行：检测到已有数据直接跳过，秒级加载
    """
    collection = _get_collection()

    if collection.count() > 0:
        print(f"  → 知识库已就绪（{collection.count()} 个 chunks），直接加载")
        return collection

    print(f"  首次运行，开始构建知识库（共 {len(KB_SOURCES)} 个文件）...\n")
    total_chunks = 0

    for topic, path in KB_SOURCES:
        # 提取文本
        if path.suffix == ".html":
            raw_text = extract_html_text(path)
        else:
            raw_text = path.read_text(encoding="utf-8", errors="replace")

        chunks = chunk_by_sentence(raw_text)
        if not chunks:
            print(f"  ⚠  跳过（无有效内容）: {path.name}")
            continue

        source = path.name
        ids, embeddings, documents, metadatas = [], [], [], []

        for i, chunk in enumerate(chunks):
            ids.append(f"{source}_{i:04d}")
            embeddings.append(embed(chunk).tolist())
            documents.append(chunk)
            metadatas.append({
                "topic":   topic,
                "source":  source,
                "chunk_i": i,
            })

        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )
        total_chunks += len(chunks)
        print(f"  ✓ [{topic:10s}] {source:<45} {len(chunks):>4} chunks")

    print(f"\n  → 入库完成，共 {total_chunks} 个 chunks，已持久化到 {DB_PATH.name}/")
    return collection


# ══════════════════════════════════════════════════════════════
# 检索工具（面试官通过 Tool Calling 调用）
# ══════════════════════════════════════════════════════════════

_collection = None   # 由 main() 初始化后注入


def search_kb(query: str, topic: str = "", top_k: int = 5) -> str:
    """
    检索 ai-handbook 知识库，返回格式化文本供 LLM 阅读。

    topic 过滤：rag / mcp / agent / interview（面试题库）/ 空字符串=全库
    """
    where = {"topic": topic} if topic else None

    q_emb = embed(query)
    kwargs: dict = {
        "query_embeddings": [q_emb.tolist()],
        "n_results":        top_k,
        "include":          ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where

    results   = _collection.query(**kwargs)
    docs      = results["documents"][0]
    metas     = results["metadatas"][0]
    distances = results["distances"][0]

    if not docs:
        return "未在知识库中找到相关内容。"

    parts = []
    for i, (doc, meta, dist) in enumerate(zip(docs, metas, distances), 1):
        score = round(1 - dist, 3)
        parts.append(
            f"[片段{i}] 来源:{meta['source']}  相关度:{score}\n{doc}"
        )
    return "\n\n".join(parts)


SEARCH_TOOL_DEF = {
    "type": "function",
    "function": {
        "name": "search_kb",
        "description": (
            "检索 ai-handbook 知识库，获取 RAG、MCP、Agent 相关知识点。"
            "出题前调用获取题目素材；候选人回答后调用核实答案正确性。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type":        "string",
                    "description": "检索关键词或问题，越具体越准确",
                },
                "topic": {
                    "type":        "string",
                    "enum":        ["rag", "mcp", "agent", "interview", ""],
                    "description": "限定主题范围（空字符串=不限制）",
                    "default":     "",
                },
            },
            "required": ["query"],
        },
    },
}


# ══════════════════════════════════════════════════════════════
# 面试官 System Prompt
# ══════════════════════════════════════════════════════════════

INTERVIEWER_SYSTEM_PROMPT = """\
你是一位资深 AI 工程师面试官，专门考察 RAG、MCP、Agent 方向的技术深度。
候选人的学习资料来自 ai-handbook，你通过 search_kb 工具检索这些内容来出题和核实答案。

【行为规则】
1. 每轮只问一个问题，等候选人回答后再追问或出下一题
2. 候选人回答后，调用 search_kb 检索知识库核实，再给出评价和追问
3. 发现候选人错误认知时，直接指出并引用知识库中的正确说法
4. 每满 5 轮给一次阶段性评分（满分 10 分）和 1-2 条改进建议
5. 优先考察顺序：原理理解 > 工程实践 > 边界场景 > 陷阱识别

【考察方向（轮流覆盖）】
- RAG：向量检索原理、分块策略、混合检索 RRF、Reranking、评估指标（Recall/MRR/RAGAS）、Agentic RAG
- MCP：协议原理、Tool/Resource/Prompt 三类能力、与 Function Calling 的关系、常见误解
- Agent：规划与推理、工具调用循环、多步任务、模型选型

【开场】从知识库中选一道中等难度的 RAG 基础题开始面试。\
"""


# ══════════════════════════════════════════════════════════════
# 面试对话（保留跨轮历史）
#
# 关键设计：messages 作为外部状态跨轮传递。
# v9 的 agentic_loop() 每次重置 messages，不适合多轮面试。
# 这里改为 interview_turn()：每轮追加消息，历史完整保留。
# 面试官因此能记得之前问了什么、候选人怎么回答的。
# ══════════════════════════════════════════════════════════════

def interview_turn(user_content: str, messages: list) -> tuple[str, list]:
    """
    一轮面试：
      1. 将用户内容追加到 messages
      2. 调用 LLM（携带完整历史 + tool 定义）
      3. 若 LLM 调用工具 → 执行 search_kb → 结果追加 → 再调用 LLM
      4. LLM 不再调用工具 → 返回回答，更新 messages

    返回: (面试官回复文本, 更新后的 messages)
    """
    messages.append({"role": "user", "content": user_content})

    for _ in range(6):   # 最多 6 次工具调用（一轮通常 1~2 次即可）
        resp = _client.chat.completions.create(
            model=_cfg["chat_model"],
            messages=messages,
            tools=[SEARCH_TOOL_DEF],
            tool_choice="auto",
            temperature=0.3,
        )
        msg = resp.choices[0].message

        # LLM 不调用工具 → 直接输出回答
        if not msg.tool_calls:
            content = (msg.content or "").strip()
            messages.append({"role": "assistant", "content": content})
            return content, messages

        # LLM 调用工具 → 执行后把结果追加回 messages
        messages.append(msg)
        for tc in msg.tool_calls:
            args   = json.loads(tc.function.arguments)
            result = search_kb(
                query=args.get("query", ""),
                topic=args.get("topic", ""),
            )
            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      result,
            })

    # 超过最大迭代次数（极少发生）
    fallback = "（工具调用超出上限，请重新提问）"
    messages.append({"role": "assistant", "content": fallback})
    return fallback, messages


# ══════════════════════════════════════════════════════════════
# 主流程
# ══════════════════════════════════════════════════════════════

def main():
    global _collection

    info = model_info()
    print(f"\n{'═'*60}")
    print(f" v11 ／ 模拟面试官（ai-handbook 知识库）")
    print(f" Provider: {info['provider']}  |  Chat: {info['chat_model']}")
    print(f"{'═'*60}")

    # ZhipuAI Tool Calling 兼容性检查
    if _cfg.get("sdk") == "zhipu":
        print("\n  ⚠️  ZhipuAI SDK 的 Tool Calling 接口与 OpenAI 有差异，面试官无法正常工作。")
        print("  请将 .env 中的 PROVIDER 改为 siliconflow 或 openai 后重新运行。\n")
        return

    # ── STEP 1：知识库 ───────────────────────────────────────
    print(f"\n{'═'*60}")
    print(" STEP 1 ／ 知识库")
    print(f"{'═'*60}\n")
    _collection = get_or_build_kb()

    # ── STEP 2：面试 ─────────────────────────────────────────
    print(f"\n{'═'*60}")
    print(" STEP 2 ／ 面试开始（Ctrl+C 退出）")
    print(f"{'═'*60}\n")

    # 初始化对话历史（system prompt 只加一次）
    messages: list = [{"role": "system", "content": INTERVIEWER_SYSTEM_PROMPT}]

    # 面试官出第一题
    print("  [面试官正在从知识库准备第一题...]\n")
    opening, messages = interview_turn(
        "请开始面试，从知识库中选一道中等难度的 RAG 基础题。",
        messages,
    )
    print(f"面试官：{opening}\n")

    # 交互循环
    turn = 1
    try:
        while True:
            answer = input("你：").strip()
            if not answer:
                continue
            print()
            response, messages = interview_turn(answer, messages)
            print(f"面试官：{response}\n")
            turn += 1
    except KeyboardInterrupt:
        print(f"\n\n  面试结束（共 {turn} 轮）")
        if turn >= 5:
            print("  提示：可输入"请给我整体评分和总结"后再退出，获取最终评价。")


if __name__ == "__main__":
    main()
