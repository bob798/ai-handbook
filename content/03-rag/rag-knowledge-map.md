---
title: RAG 知识地图
description: 用流程视图和知识冰山解释 RAG 的系统全貌，适合在学习中途校准结构感，也适合做方案讲解时快速搭起全链路心智模型。
---

# RAG 知识地图

这页用流程视图和知识冰山解释 RAG 的系统全貌，适合在学习中途校准结构感，也适合做方案讲解时快速搭起全链路心智模型。

**标签：流程视图 | 知识冰山 | 6 个核心节点 | 按需下潜**

> **这页负责系统结构全貌，不负责第一次顺序学习。** 如果你是第一次学 RAG，请先进入课程路线图。

---

## 适合任务

- 看清模块关系、解释离线与在线阶段、在方案沟通里快速讲清全链路。

---

## 流程视图

### 离线阶段 — 构建知识库

```
📄 文档加载  →  ✂️ 文本切分  →  🔢 向量化  →  🗄️ 向量存储
(Load)          (Chunk)         (Embed)        (Index)
```

**文档加载**：支持 PDF、HTML、Markdown、数据库等多种来源。使用 Document Loader 将原始内容统一抽象为文本块，是整个管道的起点。工具：LangChain Loaders、LlamaIndex Readers。

**文本切分**：将长文档切割为适合模型处理的片段（通常 256–1024 token）。策略有固定大小切分、递归字符切分、语义切分。切分粒度与 overlap 直接影响检索质量。

**向量化（Embedding）**：将文本块转换为高维稠密向量，捕捉语义信息。常用模型：OpenAI text-embedding-3-small、BGE-M3、E5-large。向量维度通常 768–3072。

**向量存储**：将向量与原始文本一起存入向量数据库（Pinecone、Weaviate、Chroma、pgvector）。建立 HNSW/IVF 索引支持毫秒级近似最近邻搜索。

---

### 在线阶段 — 响应查询

```
💬 查询输入  →  🔍 检索  →  🧩 上下文注入  →  ✨ 生成  →  📊 评估
(Query)         (Retrieve)   (Augment)         (Generate)   (Eval)
```

**查询输入**：用户问题。可选做 Query Rewriting（改写为更适合检索的形式）或 HyDE（先让 LLM 生成假设答案，再用假设答案向量做检索，提升召回率）。

**检索**：将查询向量化后在向量库中做相似度搜索取 Top-K 片段。可叠加 BM25 稀疏检索（混合搜索）+ Cross-Encoder Reranker 精排，显著提升精确率。

**上下文注入（Augmentation）**：将检索片段与用户问题组装成 Prompt 送入 LLM。System prompt 中的「只用上下文作答」约束是降低幻觉的关键。

**生成**：LLM 根据注入的上下文生成回答。关键参数：temperature（建议 0–0.3 以降低随机性）、max_tokens 控制长度。Streaming 输出提升体验。

**评估**：用 RAGAS 三指标评分：Context Relevancy（检索质量）、Faithfulness（答案忠实度）、Answer Relevancy（答案相关性）。可用 LLM-as-Judge 自动化打分。

---

## 知识冰山 — 6个核心节点深度展开

### 🔢 嵌入（语义表示）

**表层 — 核心用法**
- 将文本转为高维稠密向量
- 常用模型：text-embedding-3、BGE、E5
- 相似文本 → 相近向量，是检索的数学基础
- batch 调用 vs 实时调用的成本权衡

**关联 — 横向延伸**
- 稀疏向量 BM25 vs 稠密向量对比
- 多语言嵌入模型选型指南
- Fine-tune Embedding：何时需要领域微调
- 图像/代码嵌入的多模态扩展

**原理 — 底层机制**
- Transformer [CLS] token 聚合 vs 平均池化
- 对比学习（Contrastive Learning）训练目标
- 向量维度 vs 表达能力 vs 计算成本三角关系
- 量化（int8/binary）对精度的影响

**历史 / 前沿**
- Word2Vec(2013)→BERT→Sentence-BERT 演化
- Matryoshka Representation Learning 可变维度
- ColBERT 延迟交互模型
- Embedding 泄露：从向量反推原文的安全研究

---

### 🗄️ 索引（知识存储）

**表层 — 核心用法**
- 向量数据库选型：Pinecone/Weaviate/Chroma/pgvector
- 存储向量 + 元数据（来源、时间戳）
- HNSW 索引构建与参数调优
- Namespace/Collection 多租户隔离

**关联 — 横向延伸**
- 混合索引：向量 + 倒排（稀疏+稠密）
- 关键词过滤 + 向量搜索组合查询
- Parent-Child Chunking 层级索引
- 知识图谱 + 向量库混合架构

**原理 — 底层机制**
- ANN 算法：HNSW vs IVF vs PQ 对比
- 余弦相似度 vs 点积 vs L2 距离
- 增量更新 vs 全量重建的工程取舍
- 索引文件格式与持久化机制

**历史 / 前沿**
- Faiss(2017 Meta) 开源向量检索库的奠基意义
- 向量数据库独立赛道的兴起(2020-2023)
- 可过滤 ANN 搜索的算法突破
- DiskANN：超大规模磁盘级向量索引

---

### 🔍 检索（相关召回）

**表层 — 核心用法**
- Top-K 相似度检索基本用法
- Similarity Threshold 置信度过滤
- MMR 最大边际相关性去重
- 元数据过滤组合检索

**关联 — 横向延伸**
- 混合检索：BM25 + 向量加权融合
- Reranker 精排：Cross-Encoder 二阶段
- Query Rewriting 与 HyDE 查询增强
- 多路召回 Ensemble Retriever

**原理 — 底层机制**
- 召回率 vs 精确率在 RAG 中的独特含义
- 近似最近邻搜索的误差边界
- Reranker 为何比 Bi-Encoder 更精准
- 检索失败根因：语义 gap 分析

**历史 / 前沿**
- DPR(2020) 开创密集段落检索范式
- REALM、RAG 论文(2020)的原始架构
- Self-RAG：LLM 自主决定何时检索
- GraphRAG：微软用知识图谱增强检索

---

### 🧩 增强（上下文组装）

**表层 — 核心用法**
- Prompt Template：context + question 格式
- 上下文窗口大小与 chunk 数量权衡
- System prompt「只用上下文作答」约束
- 引用来源标注的实现方式

**关联 — 横向延伸**
- Contextual Compression 上下文压缩
- 多轮对话历史 + 当前检索融合
- Step-Back Prompting 抽象化查询
- Agent + RAG：检索作为工具调用

**原理 — 底层机制**
- Lost in the Middle：上下文位置影响注意力
- Token 预算管理：如何选择保留哪些 chunk
- Prompt Injection 通过文档注入的安全风险
- Faithfulness 与 Creativity 的对立关系

**历史 / 前沿**
- 原始 RAG 论文(Lewis et al. 2020) Prompt 设计
- Anthropic 长上下文研究：200K token 的影响
- Speculative RAG：并行起草提速
- RAG vs Long Context：两条技术路线博弈

---

### ✨ 生成（LLM 输出）

**表层 — 核心用法**
- 模型选型：GPT-4o / Claude / 本地 Llama
- Temperature 控制创造性 vs 确定性
- Streaming 输出提升用户体验
- 停止词与最大长度控制

**关联 — 横向延伸**
- Structured Output：JSON/XML 强制格式
- Function Calling 与 RAG 集成
- 本地部署（vLLM、Ollama）的成本权衡
- 多模型路由：简单问题用小模型

**原理 — 底层机制**
- KV Cache 对长上下文推理的加速
- 幻觉产生机制：为何 LLM 会捏造事实
- Attention Sink 与长文档末尾遗忘
- RLHF 如何影响模型遵循指令的倾向

**历史 / 前沿**
- GPT-3(2020) 使 LLM+检索架构成为可能
- InstructGPT 让模型真正遵循 Prompt 约束
- Speculative Decoding 并行解码提速
- RAG 与 Fine-tune 的能力边界研究

---

### 📊 评估（质量监控）

**表层 — 核心用法**
- RAGAS 三指标：Context Relevancy / Faithfulness / Answer Relevancy
- TruLens RAG 三元组评估框架
- 人工标注 Golden Dataset 构建
- A/B 测试比较不同 RAG 配置

**关联 — 横向延伸**
- LLM-as-Judge 用模型自动评分
- LangSmith / Langfuse 链路可观测性
- 在线监控：幻觉检测 + 拒答率统计
- 用户反馈信号驱动迭代优化

**原理 — 底层机制**
- 评估指标的局限：Faithfulness ≠ 正确性
- 分布偏移：测试集与真实查询的差距
- 端到端评估 vs 组件级评估的取舍
- Goodhart 定律：优化指标导致指标失效

**历史 / 前沿**
- NLP 评估困境：BLEU/ROUGE 的局限性
- RAGAS 论文(2023) 无参考自动评估
- ARES：主动检索评估系统
- Agent 时代的评估难题：轨迹 vs 结果

---

## 知识关联

| 节点 | 强关联 | 说明 |
|---|---|---|
| 嵌入 → 索引 | 0.95 | 向量化是索引前提 |
| 索引 → 检索 | 0.92 | 索引支撑检索 |
| 嵌入 → 检索 | 0.85 | 查询同样需嵌入 |
| 检索 → 增强 | 0.93 | 检索结果注入上下文 |
| 增强 → 生成 | 0.95 | 组装后送入LLM |
| 生成 → 评估 | 0.78 | 输出质量需评测 |
| 检索 → 评估 | 0.72 | 检索质量是核心评测点 |
| 索引 → 评估 | 0.52 | 索引策略影响整体质量 |

---

本文件负责"从组件角度理解全貌"。如果你要顺序学习，请回到课程路线图；如果你要快速回查术语和参数，请打开文档索引。
