---
title: Agent Loop 深度理解 — 从 ReAct 到 Harness
description: 你写过 loop 之后，剩下的 why 和 how
---

# Agent Loop 深度理解

## 读前声明

<div data-viz="IntroHook"></div>

> 📚 **这不是 agent loop 的入门文章。**
>
> 本文默认你已经跟着 [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 的中文版 12 讲**动手写过**一个 nano harness：
>
> s01 Agent 循环 · s02 工具分发 · s03 Todo 管理 · s04 Subagent · s05 Skill 加载 · s06 上下文压缩 · s07 任务系统 · s08 后台任务 · s09 Agent 团队 · s10 团队协议 · s11 自治 Agent · s12 Worktree 隔离
>
> **如果你还没完成上面 12 讲，请先去那里。** 那里教"怎么写"，这里讲"**为什么这么写**（why）"和"**工业界怎么真的落地**（how）"。读完本文，你应该能把 agent loop 的结构移植到任何非 AI 系统（HTTP server、游戏主循环、做菜流程）——这是"真懂 loop"的唯一验收。

---

# 第一幕 · why · 为什么要这么设计

## 📖 为什么必须是 loop

> 📎 在 **[shareAI s01 Agent 循环](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s01-the-agent-loop.md)** 你已经写过 `while not done: ...` 的主循环。本节告诉你为什么它必须是**循环**而不是**一次调用 + 分支判断**。

LLM 本身是无状态的一次性函数，而真实任务是"边做边看"的过程。loop 是粘合这两者的唯一方式 —— 五个底层原因：

- **① 信息不全 · 开工时模型什么都不知道**：文件内容、命令输出、测试结果都要"跑一下才知道"。必须 act → observe → 再想。
- **② 条件分支树 · 路径在运行时才展开**："修 bug"展开是：读 → 发现 X → 改 → 跑测试 → 挂了 → 再读报错 → 再改…… 分支数量事先不知道。
- **③ 上下文有限 · 不可能一次塞完整个代码库**：Loop 按需拉信息，用完就丢。这是上下文经济学的唯一解。
- **④ 工具调用即 yield · 控制权必须交还 harness**：模型说"我要 Read 文件"，harness 执行、拿结果、再喂回。yield/resume 就是 loop 的一个迭代。
- **⑤ 错误需要反馈 · 闭着眼写代码 = 必然出错**：编译报错、测试红、命令失败 —— 没有 loop 就没有反馈回路。模型必须看见信号才能修正。

## 📖 loop 是被谁"发现"的

> 📎 你在 **[shareAI s01](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s01-the-agent-loop.md)** 写的那 60 行，背后是一条 60 年的演化线——ReAct 论文只是给这个结构贴了个新标签。

没有某一个人发明。这是一条多源汇流的演化线 —— 从机器人到认知科学，最后在 2022 年的 ReAct 论文定型。

| 时间 | 里程碑 | 说明 |
|------|--------|------|
| 1960s — 1990s | **远古思想源** · Sense → Plan → Act 的几十年铺垫 | 从 Shakey 机器人到强化学习，"用循环解决序列决策"在 AI 界早已是常识。 |
| 2021.12 | **WebGPT** (OpenAI) | 最早让 LLM 在浏览器里循环执行动作，拉开 LLM agent 的序幕。 |
| 2022.05 | **MRKL Systems** (AI21) | 提出 LLM + 外部模块路由的范式，Karpas 等人给出概念框架。 |
| 2022.10 ⭐ | **ReAct** — Shunyu Yao 等 (Princeton + Google) | 第一次清晰提出 Thought → Action → Observation 交替循环。这被公认为现代 agent loop 的教科书形态。 |
| 2022.10 — 2023.03 | **工程化爆发** | LangChain（Harrison Chase）把 ReAct 变成人人可调；AutoGPT（Toran Richards）让大众第一次看到全自动 loop；BabyAGI（Yohei Nakajima）把 loop 拆成任务队列。 |
| 2024.12 — 至今 | **Harness 沉淀** | Anthropic《Building Effective Agents》区分 workflow vs agent；Claude Code、Cursor、aider 把 loop 做成基础设施。loop 从论文走进生产。 |

## 📖 远古思想源：loop 的六条血脉

> 📎 **这一节是本页的核心**——如果你只读一节，就读它。因为它示范的是"造类比"的完整过程：同一个结构在 6 个不同领域被重新发现。你在 **[shareAI s01](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s01-the-agent-loop.md)** 写的 while 循环，是这条血脉的最新化身。

今天的 agent loop 不是 2022 年凭空发明的。从 1960 年代的机器人到 1990 年代的强化学习，"感知→规划→行动"这个结构被反复验证过六次 —— ReAct 只是把它搬到了 LLM 上。理解这六条源流，才能看清 loop 的本质不是"循环调用"，而是**带反馈的决策过程**。

### 1966 — 1972 · Shakey 机器人

**世界第一台"思考型"移动机器人** — Nils Nilsson, Charles Rosen 等（Stanford Research Institute）

拿着摄像头在走廊里推箱子，第一次把"感知-建模-规划-执行"做成可运行系统。它用的 **STRIPS 规划器**（前置条件 + 动作 + 后置效果）至今仍是所有 AI 规划的语法基础。

Shakey 一次完整任务内部就是一个大 loop：拍照 → 更新世界模型 → 求解 STRIPS → 执行动作 → 再拍照。

> `perceive → model → plan → act → perceive ...`

### 1970s · Sense-Plan-Act (SPA) 三段论

**经典 AI 范式** — 经典人工智能学派的通用骨架

把智能体拆成三个独立阶段：**Sense**（传感器读入）→ **Plan**（符号推理生成动作序列）→ **Act**（执行器输出）。每一轮结束后，新感知反哺模型，下一轮重新规划。

这是现代 agent loop 的直系祖先。ReAct 的 Thought/Action/Observation 本质上就是 Plan/Act/Sense 换了个马甲。

> `sense → plan → act → (loop)`

### 1986 · Subsumption Architecture

**反 SPA 的叛逆** — Rodney Brooks (iRobot 创始人, MIT CSAIL)

Brooks 的著名论文 *"Intelligence Without Reason"* 抨击 SPA 太慢太脆 —— 机器人还没想完，老鼠已经跑了。他提出**反应式分层架构**：多个感知-动作 loop 并行运行，底层反射快，高层规划慢，高层压制低层。

这对今天多 agent、subagent、并行 loop 的架构思想影响深远。

> `多个 sense→act loop 并行 · 分层压制`

### 1983 — 至今 · SOAR

**统一认知架构** — Allen Newell, John Laird, Paul Rosenbloom（CMU）

图灵奖得主 Newell 的毕生心血：把所有认知活动统一为一个 **decide cycle**（决策周期）。每个 cycle 包含：阐述状态 → 提议算子 → 评估 → 选择 → 应用。目标栈遇到僵局就自动生成子目标 —— **这就是 subagent 的原型**。

> `elaborate → propose → decide → apply → (impasse → subgoal)`

### 1993 — 至今 · ACT-R

**产生式规则的循环触发** — John R. Anderson (CMU)

认知心理学建模的标杆。核心是**产生式规则**（IF pattern THEN action）不断匹配工作记忆并触发。每一次触发就是一轮 loop，触发结果更新工作记忆，引发下一轮匹配。

ACT-R 明确区分**程序性记忆**（规则）与**陈述性记忆**（事实）—— 这正是今天 agent 的"工具" vs "上下文"。

> `match → select → fire → update memory → (loop)`

### 1998 · Agent-Environment Loop

**loop 的数学定义** — Richard Sutton & Andrew Barto（强化学习奠基作）

《Reinforcement Learning: An Introduction》把 agent 抽象为数学对象：每个 timestep t，agent 观察状态 `sₜ`，选择动作 `aₜ`，环境反馈奖励 `rₜ₊₁` 和新状态 `sₜ₊₁`。目标是最大化累积奖励。

这是今天所有 agent loop 的**数学骨架**。当你把 LLM 的 "Thought/Action/Observation" 映射到 "policy/action/reward"，它们其实是同一个东西。

> `sₜ → π(aₜ|sₜ) → env → rₜ₊₁, sₜ₊₁ → (loop)`

> Yao 等人 2022 写 ReAct 的时候，并不是"发明"了一个新的循环。他们只是把一个已经跑了 60 年的结构，第一次用自然语言 prompt 表达出来，让 LLM 也能加入这个古老的游戏。

## 📖 Workflow vs Agent · 何时用 loop

> 📎 你在 **[shareAI s11 Autonomous Agents](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s11-autonomous-agents.md)** 写过"自治"的模式——队友自己看看板。本节告诉你什么时候**不该**让 loop 自治。

不是所有任务都适合 loop。Anthropic 的建议：**能用预编排 workflow 解决的，不要动 agent**。

<div data-viz="DecisionTree"></div>

两者都用 LLM，但控制权归属完全不同。选错模式 = 要么束手束脚、要么失控烧钱：

| 维度 | Workflow（预编排） | Agent Loop | 谁赢 |
|------|-------------------|------------|------|
| 控制权 | 人类写死流程 | **LLM 动态决定** | Agent 更灵活 |
| 可预测性 | **高 · 每步都已知** | 低 · 运行时才知道 | Workflow 更可控 |
| 任务适配 | 固定路径任务 | 开放式任务 | 看场景 |
| 调试难度 | **低 · 跑日志即可** | 高 · 需 trace 整条轨迹 | Workflow 更省心 |
| token 成本 | **低 · 只算单步** | 高 · loop × 上下文增长 | Workflow 更便宜 |
| 能力上限 | 受限于流程设计者 | **可能超越设计者** | Agent 潜力更高 |
| Anthropic 建议 | **能用就用** | 只在真需要时才用 | **优先 Workflow** |

---

# 第二幕 · how · 工业界怎么真的落地

## 🔧 控制流 · messages 数组的机制

> 📎 你在 **[shareAI s01](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s01-the-agent-loop.md)** 写的 `messages[]` 数组——本节展示它在真实 loop 里每轮怎么膨胀。

每轮 loop 把 `assistant turn + tool_result` 追加进对话历史，再整个喂回模型。**状态 = messages 数组，不是变量。**

<div data-viz="MessageConveyor"></div>

> 模型只负责"想下一步"，不负责"把下一步跑起来"。**harness 做调度、LLM 做决策。** 这是 shareAI s01 "Harness 层：循环 —— 模型与真实世界的第一道连接" 的真正含义。

## 🔧 上下文工程 · loop 每转一圈就变贵一次

> 📎 你在 **[shareAI s06 Context Compact](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s06-context-compact.md)** 写过三层压缩策略。本节告诉你它的理论根源：为什么压缩不是优化，是生死线。

关键不是"窗口多大"，而是**每一轮 loop 都会把上一轮的 tool_result 追加进来，context 单调递增**。一次调用的成本 = 当前累积 token × 单价。所以 loop 跑得越深，单步越贵、模型越容易开始"遗忘目标"。

<div data-viz="LoopTokenGrowth"></div>

*点按钮看四种模型分别在第几轮撑爆 —— 每点一次 = loop 再转一轮：prompt + assistant + tool_result 追加到历史。*

## 🔧 工具粒度 · 决定 loop 长度

> 📎 你在 **[shareAI s02 Tool Use](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s02-tool-use.md)** 注册进 dispatch map 的那些工具——本节告诉你粒度选错会让 loop 长 5 倍。

"工具粒度决定 loop 长度" 想说的是：**同一个任务能不能一步到位，完全取决于 harness 给 LLM 暴露了什么 API**。工具太碎，LLM 要跑十几轮拼装；工具太粗，LLM 又容易失控。这是 harness 设计最重要的 API 决策，直接决定了成本、延迟、可靠性。

<div data-viz="ToolGranularityCompare"></div>

> 粗工具不是总赢：`run_bash` 可以一步改文件，也可以一步 `rm -rf /`。粒度 = 效率 vs 安全的平衡点。这就是 Claude Code 为什么默认给细粒度工具 + 可选 bash。

## 🔧 子 agent · 嵌套 loop 的通信

> 📎 你在 **[shareAI s04 Subagents](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s04-subagent.md)** 实现的独立 `messages[]` subagent——本节告诉你它在工业界叫"上下文隔离"，是防止 context 污染的关键。

主 loop 调子 loop，是隔离 context 污染、实现并行的关键模式。Claude Code 的 Agent tool 就是这么做的。

<div data-viz="SubagentPipe"></div>

---

# 元层 · 从识别到创造

## 失败模式：loop 会在哪里死？

> 📎 你在 **[shareAI s02 Tool Use](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s02-tool-use.md)** + **[s05 Skill Loading](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s05-skill-loading.md)** 调试过的 tool_result 异常，在工业界有一整套症状分类。

必须亲手观察过这些病症，才算真正懂 loop。

| 症状 | 本质 | 对策 |
|------|------|------|
| 🔴 **死循环** · 反复调同一个工具 | 模型拿到同样结果，却不知道换思路 | 循环检测 / 强制跳出 |
| 🟠 **上下文崩塌** · 历史太长忘目标 | 30 轮后模型忘了最初要干什么 | compaction 或重启子 agent |
| 🔴 **幻觉工具** · 编造不存在的工具名 | 瞎写参数、瞎调函数 | schema 强校验 + 错误反馈闭环 |
| 🟠 **过早收敛** · 以为做完其实没做 | 测试没跑、需求没满足就宣告完成 | 独立 verifier 复核 |
| 🔴 **Reward Hacking** · 绕过检查骗分数 | 改测试让它通过、忽略失败断言 | Anthropic 明确点名的风险 |
| 🟣 **Prompt Injection** · 工具结果含恶意指令 | Simon Willison 的 "lethal trifecta" | 私有数据 + 不可信内容 + 外发能力 三条同时出现时最危险 |

## 如何识别任何系统里的 loop

> **本节是整页的目的**。前面所有章节都在训练一件事：给你一个从没见过的系统（HTTP server、游戏 AI、做菜流程），你能不能**主动**拆出它的 loop 结构。这是迁移，不是复述。

### 造类比的 4 步法

识别任何系统是否是 agent loop，问自己 4 个问题：

1. **反馈（feedback）**：什么**事件**驱动下一步？（时钟滴答？用户输入？外部响应？上一步的结果？）
2. **分支树（branching）**：路径是不是**运行时才展开**？（固定流程 ≠ loop · 动态分支 = loop）
3. **状态累积（state accumulation）**：每轮是否有**单调增长**的状态？（累计历史 = 典型 loop · 只读当前帧 = 不是）
4. **调度者（scheduler）**：**谁在想 · 谁在做**？（思考主体和执行主体分离 = 经典 agent-harness 划分）

**4 项都有 → 这是一个 agent loop。** 少一项，就是某种"退化版 loop"（例如只有反馈没有分支树的系统是事件驱动程序，不是 agent）。

### 用下面的工具亲自造一个

选一个你熟悉的系统，填入 4 格——组件会提供参考答案，填完再展开对照。**注意：你的答案没有"正确"，只有"更深还是更浅"。**

<div data-viz="AnalogyBuilder"></div>

> 能做完上面的填空，你就完成了本文的唯一验收：**把 agent loop 从 AI 域迁移出去**。接下来再遇到"XX 能不能做成 agent"的问题，你手里就有了判据，而不是靠直觉。

---

# 出口 · 从拔高到下一步

## 学习路线：6 步打透 loop（约 3 周）

> "只读不动"学不会 agent loop。每一步都给了**要读的材料**、**要动手做的事**、**验收产出**。按顺序走，每步产出叠加到下一步，到 Step 6 你手里就有一个能跑 SWE-bench 的完整 agent。

### 01 · 入门 · 亲手实现 ReAct

**目标**：从 0 写出一个能 Think→Act→Observe 的 loop，体会"状态 = messages 数组"
**难度** · 初 · **⏱ 1–2 天** · 📎 对应 [shareAI s01](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s01-the-agent-loop.md)

- **读**
  - ReAct 原论文 `arxiv 2210.03629`（重点 §3-4）
  - Anthropic Cookbook · Tool Use 章节
  - LangChain 官方 ReAct agent quickstart
- **做**
  - 用 Python + Anthropic SDK 写 `~60 行` 的 ReAct loop
  - 提供两个假工具：`calculator`、`search`（mock 数据即可）
  - 让它答："《三体》作者出生那年中国 GDP 多少"
- **产出**
  - 一个 `react_loop.py`，能看到 Thought/Action/Observation 交替
  - 能打印完整 messages 历史

### 02 · 工程 · 解剖真实 harness

**目标**：看懂从 LLM 输出到工具执行到 result 回填的完整链路
**难度** · 中 · **⏱ 3–5 天** · 📎 对应 [shareAI s02](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s02-tool-use.md) + [s07 Task System](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s07-task-system.md)

- **读**
  - Anthropic《Building Effective Agents》2024.12
  - MCP 官方规范 `modelcontextprotocol.io`
  - Simon Willison 关于 agentic coding 的系列博客
- **做**
  - clone `aider` 或 `sweep` 任一开源 harness，本地跑通
  - 在主循环打断点，追一次 tool call 的完整生命周期
  - 自己实现一个最小 MCP server（暴露 1 个读文件工具）
- **产出**
  - 一张主循环伪代码图（500 字以内）
  - 可用的 MCP server 能被 Claude Code 调用

### 03 · 上下文 · 对抗 context rot

**目标**：亲自测出"loop 越长越笨"，并用工程手段救回来
**难度** · 中 · **⏱ 2–3 天** · 📎 对应 [shareAI s06](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s06-context-compact.md)

- **读**
  - Chroma Research《Context Rot》实验报告
  - MemGPT / Letta 论文 `arxiv 2310.08560`
  - Anthropic Prompt Caching 文档（5 分钟 TTL）
- **做**
  - 给 Step 1 的 loop 加一个 summarization：历史 > 5 轮就压缩前文
  - 开启 prompt caching，测 TTFB 和成本差异
  - 做 A/B：无压缩 vs 有压缩 跑 20 个多步任务
- **产出**
  - 一张 token × 成功率 对比图
  - 一段 200 字结论：什么时候该压、什么时候该 off-load

### 04 · 规划 · 从 reactive 升级到 reflective

**目标**：让 agent 从失败中学习，而不是反复踩同一个坑
**难度** · 中高 · **⏱ 2–3 天** · 📎 (本页专属 · 超 shareAI 范围)

- **读**
  - Reflexion `arxiv 2303.11366`
  - Tree of Thoughts `arxiv 2305.10601`
  - Voyager (Minecraft agent) `arxiv 2305.16291`
- **做**
  - 在 loop 里加"反思步"：失败后让模型写一条 lesson，存到 memory
  - 下一次开局把 memory 里相关 lesson 拼到 system prompt
  - 观察同样任务第 2 次尝试的成功率提升
- **产出**
  - 一个能自我修正的 agent demo
  - 一张"反思前/后"成功率对比表

### 05 · 安全 · 给自己的 agent 红队攻击

**目标**：亲眼看到 prompt injection 怎么让 loop 失控
**难度** · 中 · **⏱ 2–3 天** · 📎 对应 [shareAI s02 工具滥用场景](https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s02-tool-use.md)

- **读**
  - Simon Willison · Prompt Injection 系列（按时间顺序）
  - "Lethal Trifecta" 文章
  - Anthropic Responsible Scaling Policy
- **做**
  - 设计 3 个恶意工具结果：泄密型、提权型、外发型
  - 跑你自己 Step 1-4 的 agent，看它在哪种 payload 下上当
  - 加一层 output sanitizer + 权限白名单，重跑
- **产出**
  - 一份红队报告：10 个 payload × 防御前后对比
  - 知道 lethal trifecta 在你场景里具体怎么触发

### 06 · 评测 · 跑 SWE-bench 亲眼看 agent 怎么挂

**目标**：用工业基准做毕业答辩 —— 你的 agent 的真实分数
**难度** · 高 · **⏱ 3–7 天** · 📎 (本页专属 · 超 shareAI 范围)

- **读**
  - SWE-bench 论文 `arxiv 2310.06770` + SWE-bench Verified
  - τ-bench 论文（工具调用评测）
  - 排行榜前 3 方案的技术 blog
- **做**
  - clone `SWE-bench-Lite`（~300 题），Docker 里跑通评测流水线
  - 用 Step 1-5 搭建的 agent 跑前 30 题
  - 对失败样本分类：context / tool / planning / 其他
- **产出**
  - 一张 pass@1 分数（你的基线）
  - 一份失败分析报告 —— 这就是你下个迭代的 roadmap

---

**为什么是这 6 步？** 每一步都在解决一个具体的**认知瓶颈**：

① 看不见 loop → 手写 · ② 不懂 harness → 读源码 · ③ 被 context 撑爆 → 加压缩 · ④ 学不会失败 → 加反思 · ⑤ 被注入 → 做红队 · ⑥ 不知道好坏 → 跑基准。

跳过任何一步都行，但每一步省下的时间都会在后面的工程里还回来 —— 尤其是 Step 2 和 Step 6。

## 一句话抓手

**Loop 本身是 20 行代码**，真正的学问在 loop 周围的四个约束：

<div data-viz="MindMapCompression"></div>

① **context**（能塞多少） · ② **tools**（能做什么） · ③ **planning**（怎么决定下一步） · ④ **safety**（做错了谁兜底）

这四条任何一条松掉，loop 就变成玩具。你在 shareAI 12 讲里写的每个组件，本质上都在服务其中一个约束——现在你知道为什么了。
