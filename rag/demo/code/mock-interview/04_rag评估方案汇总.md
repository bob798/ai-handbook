# RAG 评估方案汇总

---

## 一、评估的三个阶段

```
文档 → [Chunking] → Embedding → [Retrieval] → Prompt → [Generation] → 回答
          ↑                         ↑                        ↑
       间接评估                   直接评估                  直接评估
```

---

## 二、核心指标体系

### Retriever 侧
| 指标 | 含义 | 怎么算 |
|------|------|--------|
| **Context Recall** | 该召回的都召回了吗 | 命中 ground truth 的比例 |
| **Context Precision** | 召回的里有多少是有用的 | 相关文档 / 总召回文档 |
| **Hit Rate** | Top-K 里有没有正确文档 | 有=1，无=0 |
| **MRR** | 正确文档排第几 | 1/rank 的均值 |

### Generator 侧
| 指标 | 含义 | 说明 |
|------|------|------|
| **Faithfulness** | 回答是否忠实于检索内容 | 有没有超出上下文发挥 |
| **Answer Relevancy** | 回答是否切题 | 和问题的相关程度 |
| **Hallucination** | 凭空捏造了多少 | RAGChecker 的 claim 级别检测 |
| **Noise Sensitivity** | 被无关文档带跑了吗 | 塞入噪声文档后回答是否变差 |

---

## 三、主流工具选型

| 工具 | 定位 | 适用阶段 |
|------|------|---------|
| **RAGAS** | 综合评估，最流行 | 研究 / 快速验证 |
| **RAGChecker** | Claim 级诊断，找锅归属 | 生产排查 |
| **DeepEval** | 5指标，可追溯到 chunk 参数 | 工程优化 |
| **Arize Phoenix** | Embedding 可视化 | debug 召回失败 |

---

## 四、没有 ground truth 怎么办

真实场景往往没有标注数据，两种解法：

1. **合成数据**：用 LLM 从文档自动生成 QA 对作为 ground truth（RAGAS 内置支持）
2. **无参考评估**：只看 Faithfulness + Answer Relevancy，不依赖标准答案

---

## 五、学习路径对应

| 你的进度 | 对应评估动作 |
|---------|------------|
| V1 最小 RAG（当前） | 肉眼对比有/无 RAG 的回答差异 |
| V2 分块策略 | 改变 chunk_size，对比 Context Recall 变化 |
| V3 混合检索 | 对比纯向量 vs 混合的 Hit Rate |
| V4 评估 pipeline | 接入 RAGAS，跑自动化指标 |
| 生产优化 | 接入 RAGChecker，定位具体失效点 |
