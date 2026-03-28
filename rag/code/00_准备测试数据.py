#!/usr/bin/env python3
"""
00_准备测试数据.py — 从公开数据集生成测试用知识库 + Golden Dataset
=====================================
数据源：DuReader Robust（百度开放中文阅读理解数据集，通用问答）
       HuggingFace: datasets库自动下载

输出：
  test_documents.txt   — 知识库文本（替换 v10 TENANT_DOCS 用）
  test_golden.json     — Golden Dataset（替换 v8 GOLDEN_DATASET 用）

依赖：pip install datasets
运行：python 00_准备测试数据.py

数据说明：
  DuReader Robust 是百度开放的中文阅读理解数据集，
  每条样本包含：篇章（context）+ 问题（question）+ 答案（answer）
  覆盖通用问答场景，适合验证中文 RAG 检索质量。
"""

import json
from pathlib import Path

try:
    from datasets import load_dataset
except ImportError:
    print("请先安装依赖：pip install datasets")
    raise


# ══════════════════════════════════════════════════════════════
# 配置
# ══════════════════════════════════════════════════════════════

N_DOCS    = 20   # 抽取多少篇文章作为知识库（太多会让 embedding 慢）
N_QUERIES = 30   # 生成多少条 Golden Dataset 问题

# 难度分布（easy/medium/hard 按答案长度粗估）
EASY_MAX   = 20   # 答案 ≤20字 → easy
MEDIUM_MAX = 60   # 答案 21~60字 → medium
# 答案 >60字 → hard


def classify_difficulty(answer: str) -> str:
    n = len(answer)
    if n <= EASY_MAX:
        return "easy"
    elif n <= MEDIUM_MAX:
        return "medium"
    else:
        return "hard"


def main():
    print(f"\n{'═'*60}")
    print(f" 准备测试数据（DuReader Robust）")
    print(f"{'═'*60}")

    # ── STEP 1：加载数据集 ─────────────────────────────────────
    print(f"\n STEP 1 ／ 加载 DuReader Robust（首次运行会下载 ~10MB）\n")
    ds = load_dataset("shizueyy/dureader-robust-v2", split="train")
    print(f"  → 总样本数: {len(ds)}")

    # ── STEP 2：去重并抽取 ─────────────────────────────────────
    print(f"\n STEP 2 ／ 去重 + 抽取 {N_DOCS} 篇文章 / {N_QUERIES} 条问题\n")

    seen_contexts: dict[str, int] = {}   # context前50字 → doc_id
    documents: list[str] = []
    golden: list[dict] = []

    for row in ds:
        context  = row["context"].strip()
        question = row["question"].strip()
        # answers 字段结构：{"text": [...], "answer_start": [...]}
        answers  = row.get("answers", {}).get("text", [])
        if not answers:
            continue
        answer = answers[0].strip()
        if not answer or answer not in context:
            continue

        key = context[:50]
        if key not in seen_contexts:
            if len(documents) >= N_DOCS:
                continue
            seen_contexts[key] = len(documents)
            documents.append(context)

        if len(golden) < N_QUERIES:
            doc_id = seen_contexts[key]
            # 只收录答案确实在已收录文档里的问题
            if doc_id < len(documents):
                golden.append({
                    "id":           f"Q{len(golden)+1:03d}",
                    "query":        question,
                    "ground_truth": answer,
                    "difficulty":   classify_difficulty(answer),
                    "source_doc":   doc_id,
                })

        if len(documents) >= N_DOCS and len(golden) >= N_QUERIES:
            break

    print(f"  → 收录文章数: {len(documents)}")
    print(f"  → Golden 问题数: {len(golden)}")

    diff_counts = {}
    for q in golden:
        diff_counts[q["difficulty"]] = diff_counts.get(q["difficulty"], 0) + 1
    print(f"  → 难度分布: {diff_counts}")

    # ── STEP 3：保存 ───────────────────────────────────────────
    print(f"\n{'═'*60}")
    print(f" STEP 3 ／ 保存文件")
    print(f"{'═'*60}\n")

    out_dir = Path(__file__).parent

    # 知识库文本：段落之间用双换行分隔
    doc_path = out_dir / "test_documents.txt"
    doc_path.write_text("\n\n".join(documents), encoding="utf-8")
    print(f"  → 知识库文本: {doc_path.name}  ({doc_path.stat().st_size // 1024} KB)")

    # Golden Dataset
    golden_path = out_dir / "test_golden.json"
    golden_path.write_text(
        json.dumps(golden, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"  → Golden Dataset: {golden_path.name}  ({len(golden)} 条)")

    # ── STEP 4：使用说明 ───────────────────────────────────────
    print(f"""
  下一步：

  ① 验证检索质量（v8）
     修改 08_v8_评估框架.py：
       把 DOCUMENT 替换为 test_documents.txt 的内容
       把 GOLDEN_DATASET 替换为 test_golden.json 的内容
     运行：python 08_v8_评估框架.py

  ② 验证企业级特性（v10）
     修改 10_v10_enterprise.py：
       TENANT_DOCS["engineering"] = open("test_documents.txt").read()
     运行：python 10_v10_enterprise.py
    """)


if __name__ == "__main__":
    main()
