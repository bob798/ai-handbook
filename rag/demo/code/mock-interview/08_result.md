python 08_v8_评估框架.py 

════════════════════════════════════════════════════════════
 v8 ／ RAG 评估框架（4 项 RAGAS 风格指标）
 Provider: siliconflow  |  Chat: Qwen/Qwen2.5-7B-Instruct
════════════════════════════════════════════════════════════

  检索基线 Recall@3=1.0  MRR=0.929

  建立检索索引...
  → 3 个 chunks，双路索引就绪

════════════════════════════════════════════════════════════
 STEP 3 ／ 逐条评估（检索 → 生成 → 4 项打分）
════════════════════════════════════════════════════════════

  ID         CR     CP      F     AR  Query
  ────────────────────────────────────────────────────────────
  🟡Q001   1.00   0.33   0.50   0.80  RAG 的分块推荐用多大？overlap 比例是多少？...
  🟢Q002   1.00   0.33   0.50   0.80  RAG 解决了大模型哪些核心问题？...
  🟡Q003   0.80   0.33   0.50   0.80  不同类型的文档应该用什么分块策略？...
  🟢Q004   1.00   0.33   0.50   0.50  Chroma 和 Qdrant 各适合什么场景？...
  🔴Q005   1.00   0.33   0.50   0.80  为什么分块太大会影响 RAG 质量，具体原因是什么？...
  🟡Q006   1.00   0.33   0.50   0.50  Faithfulness 指标衡量的是什么？...
  🟢Q007   1.00   0.33   0.50   1.00  向量维度是多少？用什么衡量两个向量的相似度？...

════════════════════════════════════════════════════════════
 STEP 4 ／ 系统级报告（v1~v7 最优管道）
════════════════════════════════════════════════════════════

  指标                          得分  解读
  ────────────────────────────────────────────────────────────
  Context Recall           0.971  █████████░  召回内容覆盖了多少答案信息
  Context Precision        0.330  ███░░░░░░░  召回的 chunk 有多少是真正有用的
  Faithfulness             0.500  █████░░░░░  答案有没有幻觉（是否忠实文档）
  Answer Relevancy         0.743  ███████░░░  答案有没有切题

  诊断思路：
    Context Recall 低  → 相关文档没被召回，优化检索（v5/v6/v7 的方法）
    Context Precision 低 → 召回了太多噪音，加 Reranking（v6）或缩小 Top-K
    Faithfulness 低    → 模型在幻觉，加强 Prompt（"只用文档信息"约束）
    Answer Relevancy 低 → 答非所问，检查 Prompt 或 query 理解

  RAGAS 框架集成（生产推荐）：
  ─────────────────────────────────────────
  pip install ragas datasets langchain-openai

  from ragas import evaluate
  from ragas.metrics import (
      faithfulness, answer_relevancy,
      context_recall, context_precision
  )
  from datasets import Dataset

  data = {
      "question":    [item["query"]    for item in records],
      "answer":      [item["answer"]   for item in records],
      "contexts":    [item["contexts"] for item in records],
      "ground_truth":[item["ground_truth"] for item in GOLDEN_DATASET],
  }
  result = evaluate(
      Dataset.from_dict(data),
      metrics=[faithfulness, answer_relevancy, context_recall, context_precision],
  )
  print(result)
  ─────────────────────────────────────────
  RAGAS 内部做的事和本文件完全一致，只是有更严格的 prompt 和更好的批量处理。
    
  → 已保存到 v8_eval_result.json

  优化循环总结（v3.5 → v8）：
    v3.5  建立检索基线
    v4    Embedding 模型选型
    v5    混合检索（BM25 + 向量 + RRF）
    v6    Reranking（两阶段精排）
    v7    Query 变换（Multi-Query / HyDE / Step-back）
    v8    评估框架（4 维度打分，闭环优化）  ← 你在这里

  → 下一步：python 09_v9_agentic_rag.py（进阶：让 LLM 自主决策检索策略）