---
title: RAG 论文速查表
description: 70+ 篇 RAG 领域高影响力论文索引，按类别分组，覆盖 2023.03–2026.02，来源 awesome-generative-ai-guide。
---

# RAG 论文速查表

> 数据来源：[awesome-generative-ai-guide / rag_research_table](https://github.com/aishwaryanr/awesome-generative-ai-guide/blob/main/research_updates/rag_research_table.md)（持续更新中）
>
> 本页是**索引**，不是精读。每篇论文提供一句话中文摘要 + arxiv 链接，方便在学习课程主线时快速溯源。

---

## 如何使用本页

- **按类别浏览**：找某个方向的代表性工作（如 "GraphRAG 有哪些变体？"）
- **按时间回溯**：了解某个时期的研究热点
- **交叉引用**：课程文章中提到的技术点，可回到这里找原始论文

---

## 类别说明

| 类别 | 含义 |
|------|------|
| RAG Survey | 综述类，系统梳理 RAG 方法论 |
| RAG Enhancement | 提升 RAG 管线效率和效果的高级技术 |
| Retrieval Improvement | 聚焦检索环节的增强 |
| Comparison Papers | RAG 与其他方法的对比研究 |
| Domain-Specific RAG | RAG 在特定领域的适配 |
| RAG Evaluation | RAG 系统的评估框架和基准 |
| RAG Embeddings | 面向 RAG 优化的 Embedding 方法 |
| Input Processing for RAG | 输入数据预处理技术 |
| RAG Framework | 可用于实现 RAG 管线的开源工具/框架 |
| RAG Enhanced LLMs | 通过检索增强提升 LLM 能力 |

---

## RAG Survey

| 论文 | 摘要 | 时间 |
|------|------|------|
| [Towards Agentic RAG with Deep Reasoning](https://arxiv.org/abs/2507.09477) | 统一视角综述 RAG 与推理的交叉融合，梳理 Agentic RAG 框架分类 | 2025.07 |
| [Agentic RAG Survey](https://arxiv.org/abs/2501.09136) | 探讨自主 AI Agent 如何集成到 RAG 管线，涵盖反思、规划、工具使用等模式 | 2025.02 |
| [Pandora's Box or Aladdin's Lamp](https://arxiv.org/abs/2408.13533) | 定义 7 种语言噪声类型，发现部分噪声反而能提升 RAG 性能 | 2024.08 |
| [Searching for Best Practices in RAG](https://arxiv.org/abs/2407.01219) | 实验探索 RAG 最佳实践，平衡性能与效率，涵盖多模态检索增强 | 2024.07 |
| [Observations on Building RAG for Technical Documents](https://arxiv.org/pdf/2404.00657) | 针对技术文档 RAG 的实践建议与常见挑战 | 2024.05 |
| [RAG and RAU: A Survey](https://arxiv.org/pdf/2404.19543) | 全面综述检索增强语言模型的演进、分类和应用 | 2024.04 |
| [A Survey on Retrieval-Augmented Text Generation for LLMs](https://arxiv.org/pdf/2404.10981) | 按预检索→检索→后检索→生成四阶段梳理 RAG 技术演进 | 2024.04 |
| [Retrieval-Augmented Generation for LLMs: A Survey](https://arxiv.org/abs/2312.10997) | 从 Naive → Advanced → Modular RAG 的演进综述，含评估框架 | 2023.12 |

---

## RAG Enhancement

| 论文 | 摘要 | 时间 |
|------|------|------|
| [A-RAG: Hierarchical Retrieval Interfaces](https://arxiv.org/abs/2602.03442) | 层级检索接口（关键词/语义/chunk read），GPT-4o-mini 达 HotpotQA 94.5% | 2026.02 |
| [CatRAG: Context-Aware Traversal](https://arxiv.org/abs/2602.01965) | 识别图 RAG 中的"静态图谬误"，引入查询感知动态边权重 | 2026.02 |
| [HGMem: Hypergraph-based Memory](https://arxiv.org/abs/2512.23959) | 超图记忆机制支持多步 RAG 的复杂推理 | 2025.12 |
| [MiA-RAG: Mindscape-Aware RAG](https://arxiv.org/abs/2512.17220) | 层级摘要构建"心智景观"，提升长文档 RAG 全局上下文感知 | 2025.12 |
| [RAGBoost: Context Reuse](https://arxiv.org/abs/2511.03475) | 会话间上下文复用，prefill 性能提升 1.5-3X 同时保持推理精度 | 2025.11 |
| [RegionRAG: Region-level Retrieval](https://arxiv.org/abs/2510.27261) | 从文档级到区域级检索单元，R@1 提升 10%，token 用量减少 29% | 2025.10 |
| [RAG-Anything](https://arxiv.org/abs/2510.12323) | 双图构建实现跨模态知识检索（文本+图表+公式） | 2025.10 |
| [ComoRAG: Cognitive-Inspired Memory](https://arxiv.org/abs/2508.10419) | 认知启发式迭代推理 + 动态记忆工作区，长文本 QA 提升 11% | 2025.08 |
| [NodeRAG: Heterogeneous Graph](https://arxiv.org/abs/2504.11544) | 异构全节点化图结构，索引和查询效率优于 GraphRAG/LightRAG | 2025.04 |
| [UniversalRAG: Multi-modal Multi-granularity](https://arxiv.org/abs/2504.20734) | 模态感知路由机制，跨模态多粒度检索 | 2025.04 |
| [Improving RALM with Self-Reasoning](https://arxiv.org/abs/2407.19813) | 自推理轨迹三步法（相关性→证据→分析），少量训练资源即大幅提升 | 2025.03 |
| [MMOA-RAG: Multi-Agent RL](https://arxiv.org/abs/2501.15228) | 将 RAG 各组件视为 RL Agent，统一奖励优化全局目标 | 2025.01 |
| [OmniThink: Slow-Thinking Writing](https://arxiv.org/abs/2501.09751) | 模拟人类迭代扩展+反思的慢思维写作框架 | 2025.01 |
| [Enhancing RAG: Best Practices](https://arxiv.org/abs/2501.07391) | 查询扩展 + 新检索策略，提供 RAG 性能优化的可操作建议 | 2025.01 |
| [VideoRAG](https://arxiv.org/abs/2501.05874) | 动态检索相关视频，利用视觉+文本双模态信息增强生成 | 2025.01 |
| [Don't Do RAG: Cache-Augmented Generation](https://arxiv.org/pdf/2412.15605) | 预加载知识到扩展上下文 + 缓存参数，消除检索延迟 | 2024.12 |
| [Auto-RAG: Autonomous Iterative Retrieval](https://arxiv.org/abs/2411.19443) | 自主多轮对话式检索，根据问题难度动态调整迭代次数 | 2024.11 |
| [HtmlRAG](https://arxiv.org/abs/2411.02959v1) | 用 HTML 替代纯文本保留结构语义信息，6 个 QA 数据集表现提升 | 2024.11 |
| [Beyond Text: Multimodal RAG](https://arxiv.org/abs/2410.21943) | 工业场景多模态 RAG，图片文本摘要策略优于单模态 | 2024.10 |
| [LongRAG (Oct)](https://arxiv.org/abs/2410.18050) | 全局理解 + 精确细节双视角，长文档 QA 提升 17.25% | 2024.10 |
| [ChatQA 2](https://arxiv.org/pdf/2407.14482) | Llama3 扩展至 128K 上下文，RAG 基准超越 GPT-4-Turbo | 2024.07 |
| [COCOM: Context Compression](https://arxiv.org/abs/2407.09252) | 长上下文压缩为少量 Context Embeddings，解码加速 5.69× | 2024.07 |
| [LongRAG (June)](https://arxiv.org/abs/2406.15319) | 4K-token 长检索单元 + 长上下文 LLM，零样本 NQ EM 62.7% | 2024.06 |
| [PlanRAG](https://arxiv.org/abs/2406.12430) | 先规划决策再检索数据，决策 QA 超越迭代 RAG 15.8% | 2024.06 |
| [From RAGs to Rich Parameters](https://arxiv.org/abs/2406.12824) | 因果中介分析揭示 LLM 主要依赖上下文而非参数记忆 | 2024.06 |
| [Buffer of Thoughts](https://arxiv.org/abs/2406.04271) | 元缓冲区存储可复用思维模板，10 个推理任务 SOTA | 2024.06 |
| [SeaKR: Self-aware Knowledge Retrieval](https://arxiv.org/abs/2406.19215) | 基于 LLM 自感知不确定性的自适应检索和策略选择 | 2024.06 |
| [A Tale of Trust and Accuracy](https://arxiv.org/abs/2406.14972) | 基座模型在 RAG 任务中平均超过指令微调模型 20% | 2024.06 |
| [METRAG: Multi-layered Thoughts](https://arxiv.org/pdf/2405.19893) | 相似性+实用性双层思维 + LLM 自适应摘要器 | 2024.05 |
| [HippoRAG](https://arxiv.org/abs/2405.14831) | 海马体索引理论启发，LLM + 知识图谱 + PPR，多跳 QA 显著提升 | 2024.05 |
| [When to Retrieve](https://arxiv.org/pdf/2404.19705) | 引入 ⟨RET⟩ 特殊 token，LLM 自主决定何时触发检索 | 2024.04 |
| [RA-ISF: Iterative Self-Feedback](https://arxiv.org/abs/2403.06840) | 迭代分解+三子模块处理，超越 GPT-3.5 和 Llama2 | 2024.03 |
| [RAFT: Domain-Specific RAG](https://arxiv.org/abs/2403.10131) | 训练模型忽略无关文档、从相关文档中引用证据 | 2024.03 |
| [RAT: Retrieval Augmented Thoughts](https://arxiv.org/abs/2403.05313) | 迭代修正思维链，代码/数学/写作/规划平均提升 23% | 2024.03 |
| [Retrieve Only When It Needs (Rowen)](https://arxiv.org/abs/2402.10612) | 跨语言不一致检测触发检索，平衡内部推理与外部证据 | 2024.02 |
| [RAPTOR](https://arxiv.org/abs/2401.18059) | 递归摘要构建层级树，QuALITY 基准 +20% 绝对准确率 | 2024.01 |
| [CRAG: Corrective RAG](https://arxiv.org/abs/2401.15884) | 检索评估器 + 置信度自适应策略 + Web 搜索回退，4 个数据集显著提升 | 2024.01 |
| [Self-RAG](https://arxiv.org/abs/2310.11511) | 反射 token 驱动自适应检索和自我评判，7B/13B 超越传统 RAG | 2023.10 |
| [DSPy](https://arxiv.org/abs/2310.03714) | 声明式 LM 管线编程框架，编译器自动优化 prompt 和示例 | 2023.10 |
| [Retrieval-Generation Synergy](https://arxiv.org/abs/2310.05149) | 检索与生成迭代协同，提升多步推理能力 | 2023.10 |
| [RECOMP: Compression and Selective Augmentation](https://arxiv.org/abs/2310.04408) | 抽取/抽象双压缩器，检索文档压缩后再注入 | 2023.10 |
| [Knowledge-Augmented LM Verification](https://arxiv.org/abs/2310.12836) | 小 LM 验证器检测检索和生成中的事实错误 | 2023.10 |
| [REST: Retrieval-Based Speculative Decoding](https://arxiv.org/abs/2311.08252) | 检索驱动的投机解码，代码/文本生成加速 1.62-2.36× | 2023.11 |
| [FILCO: Learning to Filter Context](https://arxiv.org/abs/2311.08377) | 训练上下文过滤模型识别有用段落，QA/事实验证/对话均提升 | 2023.11 |
| [GenRead: Generate rather than Retrieve](https://arxiv.org/abs/2209.10063) | LLM 生成上下文替代检索，聚类提示保证多样性 | 2023.09 |

---

## RAG Evaluation

| 论文 | 摘要 | 时间 |
|------|------|------|
| [WildGraphBench](https://arxiv.org/abs/2602.02053) | 1100 题评估 GraphRAG，揭示其在摘要任务上的不足 | 2026.02 |
| [SAGE: Benchmarking Deep Research Agents](https://arxiv.org/abs/2602.05975) | 1200 查询 + 20 万论文语料，发现 BM25 比 LLM 检索器高 30% | 2026.02 |
| [DeR2: Retrieval-Infused Reasoning Sandbox](https://arxiv.org/abs/2601.21937) | 解耦检索与推理评估，发现模型在完整检索集下反而表现更差 | 2026.01 |
| [FRAMES](https://arxiv.org/abs/2409.12941) | 统一评估事实性、检索和推理，多步检索将准确率从 0.40 提升至 0.66 | 2024.09 |
| [Summary of a Haystack](https://arxiv.org/pdf/2407.01370) | 要求系统从文档集中总结洞见并精确引用，现有系统普遍低于人类水平 | 2024.07 |
| [RAGElo](https://arxiv.org/abs/2406.14783) | LLM 生成合成查询 + Elo 排名竞赛评估 RAG 变体 | 2024.06 |
| [CRAG Benchmark](https://arxiv.org/abs/2406.04744) | 4409 个 QA 对 + Mock API，评估动态性/流行度/复杂度三维度 | 2024.06 |
| [RGB: Benchmarking LLMs in RAG](https://arxiv.org/abs/2309.01431) | 中英双语 RAG 基准，评估噪声鲁棒/负面拒绝/信息整合/反事实鲁棒 | 2023.10 |
| [RAGAS](https://arxiv.org/abs/2309.15217) | 无需人工标注的 RAG 自动评估框架，覆盖检索相关性和生成质量 | 2023.09 |

---

## Retrieval Improvement

| 论文 | 摘要 | 时间 |
|------|------|------|
| [SitEmb-v1.5: Situated Embeddings](https://arxiv.org/abs/2508.01959) | 上下文感知嵌入，将文本块含义置于更广上下文中，性能提升 10%+ | 2025.08 |
| [Toward Optimal Search and Retrieval for RAG](https://arxiv.org/abs/2411.07396) | 降低搜索精度对 RAG 影响小，但可提升检索速度和内存效率 | 2024.11 |
| [Boosting Healthcare LLMs](https://arxiv.org/abs/2409.15127) | 优化检索组件使开源 LLM 在医疗基准上媲美商业方案 | 2024.09 |
| [Structured-GraphRAG](https://arxiv.org/pdf/2409.17580) | 多知识图谱捕获结构化数据中的复杂关系，足球数据案例验证 | 2024.09 |
| [RetrievalAttention](https://arxiv.org/abs/2409.10516) | ANN 搜索加速注意力计算，128K token 仅需 16GB 显存 | 2024.09 |
| [Promptriever](https://arxiv.org/abs/2409.11136) | 像提示 LLM 一样提示检索器，MS MARCO 上 SOTA | 2024.09 |
| [RankRAG](https://arxiv.org/abs/2407.02485v1) | 统一上下文排序和答案生成的指令微调框架 | 2024.07 |
| [RE-AdaptIR](https://arxiv.org/abs/2406.14764) | 逆向工程适配增强 LLM 信息检索，零样本场景也有效 | 2024.06 |
| [Don't Forget to Connect! G-RAG](https://arxiv.org/abs/2405.18414) | GNN 重排序器结合文档连接和语义信息，超越 PaLM 2 | 2024.05 |
| [G-Retriever](https://arxiv.org/abs/2402.07630) | GNN + LLM + RAG 导航大规模文本图，软提示减少幻觉 | 2024.02 |
| [SKR: Self-Knowledge guided Retrieval](https://arxiv.org/abs/2310.05002) | LLM 判断自身知识边界，选择性引入外部检索 | 2023.10 |
| [GAR-meets-RAG](https://arxiv.org/abs/2310.20158) | GAR + RAG 联合迭代，零样本检索 BEIR 上 Recall@100 提升 17% | 2023.10 |
| [LLM-Embedder](https://arxiv.org/abs/2310.07554) | 统一检索模型适配 LLM 多样需求，优化训练方法论 | 2023.10 |
| [Learning to Retrieve In-Context Examples](https://arxiv.org/abs/2307.07164) | 迭代训练密集检索器，30 个任务证明对不同规模 LLM 均有效 | 2023.07 |
| [FLARE: Active Retrieval](https://arxiv.org/abs/2305.06983) | 前瞻性主动检索，生成过程中动态决定何时检索什么内容 | 2023.05 |
| [Knowledge Graph-Augmented Dialogue (SURGE)](https://arxiv.org/abs/2305.18846) | 知识图谱子图检索 + 对比学习确保对话事实一致性 | 2023.05 |
| [SANTA: Structure-Aware Retrieval](https://arxiv.org/abs/2305.19912) | 结构感知预训练提升代码搜索和产品搜索的零样本能力 | 2023.05 |
| [AAR: Augmentation-Adapted Retriever](https://arxiv.org/abs/2305.17331) | 通用插件式检索器，训练一次可适配从小到大各种 LLM | 2023.05 |
| [PGRA: Prompt-Guided Retrieval](https://arxiv.org/abs/2305.17653) | 任务无关检索 + 提示引导重排序，扩展 RAG 到非知识密集型任务 | 2023.05 |
| [Chain-of-Knowledge](https://arxiv.org/abs/2305.13269) | 动态适配异构知识源（结构化+非结构化），逐步修正推理链 | 2023.05 |

---

## Comparison Papers

| 论文 | 摘要 | 时间 |
|------|------|------|
| [Long Context vs. RAG](https://arxiv.org/abs/2501.01880) | 长上下文在 Wikipedia QA 上优于 RAG，但 RAG 在对话类查询上更优 | 2025.01 |
| [RAG or Long-Context LLMs: Self-Route](https://arxiv.org/abs/2407.16833) | 提出 Self-Route 方法，模型自判路由到 RAG 或长上下文 | 2024.07 |
| [Fine Tuning vs. RAG for Less Popular Knowledge](https://arxiv.org/pdf/2403.01432.pdf) | RAG 在低频实体问答上优于微调 | 2024.03 |
| [RAG vs Fine-tuning: Agriculture Case Study](https://arxiv.org/abs/2401.08406) | 农业领域对比 RAG 与微调的管线和权衡 | 2024.01 |
| [Retrieval meets Long Context LLMs](https://arxiv.org/abs/2310.03025) | 4K+检索 ≈ 16K 长上下文，Llama2-70B+检索超越 GPT-3.5-turbo-16k | 2023.10 |

---

## Domain-Specific RAG

| 论文 | 摘要 | 时间 |
|------|------|------|
| [GraphRAG Survey](https://www.arxiv.org/abs/2408.08921) | 首个 GraphRAG 全面综述，覆盖方法论、工业案例和评估策略 | 2024.08 |
| [Agentic RAG for Time Series](https://arxiv.org/abs/2408.14484) | 层级多 Agent 架构，专用子 Agent 处理不同时序任务 | 2024.08 |
| [RULE: Medical Vision LLMs](https://arxiv.org/pdf/2407.05131) | 校准检索上下文数量 + 偏好微调，医疗 VQA 准确率提升 20.8% | 2024.07 |
| [GNN-RAG for KGQA](https://arxiv.org/abs/2405.20139) | GNN 检索 + LLM 推理，知识图谱 QA 超越 GPT-4 | 2024.05 |
| [UniMS-RAG: Personalized Dialogue](https://arxiv.org/abs/2401.13256) | 多知识源统一序列到序列范式 + 自精炼机制的个性化对话 | 2024.01 |
| [RADA: Low-Resource Data Augmentation](https://arxiv.org/abs/2402.13482) | 检索相似样本引导 LLM 生成增强数据，低资源场景有效 | 2024.02 |
| [CREA-ICL: Crosslingual RAG](https://arxiv.org/abs/2311.06595) | 跨语言检索增强上下文学习，分类有效但生成任务仍有挑战 | 2023.11 |
| [PKG: Parametric Knowledge Guiding](https://arxiv.org/abs/2305.04757) | 不修改原模型参数的领域知识注入框架 | 2023.05 |

---

## RAG Enhanced LLMs

| 论文 | 摘要 | 时间 |
|------|------|------|
| [RETRO: Retrieval from Trillions of Tokens](https://arxiv.org/abs/2112.04426) | 从万亿 token 语料中检索，参数量更少但性能媲美 GPT-3 | 2024.03 |
| [Instruction-tuned LMs are Better Knowledge Learners](https://arxiv.org/abs/2402.12847) | 先指令微调再学文档（PIT），知识吸收提升 17.8% | 2024.02 |
| [Chain-of-Note](https://arxiv.org/abs/2311.09210) | 对检索文档生成顺序阅读笔记，过滤噪声并识别知识不足 | 2023.11 |
| [Tree of Clarifications](https://arxiv.org/abs/2310.14696) | 构建澄清树处理歧义问题，Disambig-F1 超越全监督方法 | 2023.10 |
| [Optimizing FiD via Token Elimination](https://arxiv.org/abs/2310.13682) | Token 级别剪枝检索段落，解码加速 62.2% 仅损失 2% 性能 | 2023.10 |
| [RA-DIT: Dual Instruction Tuning](https://arxiv.org/abs/2310.01352) | 双阶段轻量微调：优化 LLM 使用检索 + 优化检索器适配 LLM | 2023.10 |
| [InstructRetro 48B](https://arxiv.org/abs/2310.07713) | 最大规模检索增强预训练模型，指令微调后多任务超越 GPT 对应模型 | 2023.10 |
| [Making RALMs Robust to Irrelevant Context](https://arxiv.org/abs/2310.01558) | 仅 1000 条训练数据即可显著提升模型对无关检索内容的鲁棒性 | 2023.10 |
| [RegaVAE](https://arxiv.org/abs/2310.10567) | VAE 潜空间编码源文本和目标文本，减少生成幻觉 | 2023.10 |
| [Text Embeddings Reveal Almost As Much As Text](https://arxiv.org/abs/2310.06816) | 多步反转可从嵌入恢复 92% 原文，揭示隐私风险 | 2023.10 |
| [Understanding Retrieval for Long-Form QA](https://arxiv.org/abs/2310.12150) | 分析检索增强对长文本问答的归因模式和错误类型 | 2023.10 |
| [RaLLe](https://arxiv.org/abs/2308.10633) | 透明化 R-LLM 各步骤的开源评估框架 | 2023.08 |
| [RAVEN: Retrieval Augmented Encoder-Decoder](https://arxiv.org/abs/2308.07922) | Fusion-in-Context Learning 提升少样本能力，无需额外训练 | 2023.08 |
| [Iter-RetGen](https://arxiv.org/abs/2305.15294) | 检索-生成迭代协同，检索整体处理保持生成灵活性 | 2023.05 |
| [selfmem](https://arxiv.org/abs/2305.02437) | 模型自身输出作为无界记忆池，翻译/摘要/对话均创新高 | 2023.05 |
| [RETRO++](https://arxiv.org/abs/2304.06762) | 检索增强预训练的全面研究，RETRO 在事实准确性和低毒性上优于 GPT | 2023.04 |
| [UPRISE](https://arxiv.org/abs/2303.08518) | 通用提示检索器，轻量训练即可提升多种大规模 LLM 零样本表现 | 2023.03 |

---

## Input Processing for RAG

| 论文 | 摘要 | 时间 |
|------|------|------|
| [Vision-Guided Chunking](https://arxiv.org/abs/2506.16035) | 多模态模型驱动的文档分块，处理跨页表格和图文依赖 | 2025.06 |
| [KnowledGPT](https://arxiv.org/abs/2308.11761) | 代码格式查询生成 + 个性化知识库存储 | 2023.08 |
| [Query Rewriting: Rewrite-Retrieve-Read](https://arxiv.org/abs/2305.14283) | 小模型改写查询 + RL 优化，弥合输入文本与检索知识的差距 | 2023.05 |

---

## Memory Improvement

| 论文 | 摘要 | 时间 |
|------|------|------|
| [MemoRAG](https://arxiv.org/pdf/2409.05591) | 双系统架构：轻量长程模型生成草稿引导检索 + 强模型生成最终答案 | 2024.09 |
| [RET-LLM](https://arxiv.org/abs/2305.14322) | 基于 Davidson 语义的可读写记忆单元，可扩展可更新的三元组存储 | 2023.05 |

---

## RAG Framework

| 论文 | 摘要 | 时间 |
|------|------|------|
| [RAG Foundry](https://arxiv.org/pdf/2408.02545) | 开源框架统一数据创建/训练/推理/评估，Llama-3 和 Phi-3 均有提升 | 2024.08 |

---

## 更新记录

- **2026-04-20**：首次创建，收录 70+ 篇论文，来源 awesome-generative-ai-guide
