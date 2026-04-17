---
title: Skill 自动提取 vs 智能推荐
description: 两种 Skill 机制的深度架构对比：OMC 的 Auto-Extract（从过程中生成能力）vs skill-recommend 的 Context-Aware Recommend（从环境中发现能力）。一个是造菜谱，一个是翻菜单。
---

# Skill 自动提取 vs 智能推荐

两种 Skill 机制的深度架构对比：OMC 的 **Auto-Extract（从过程中生成能力）** vs skill-recommend 的 **Context-Aware Recommend（从环境中发现能力）**。一个是造菜谱，一个是翻菜单。

---

## 全景对比

### 一句话区分

> **Auto-Extract** = 师傅做完一道菜，厨房自动把过程变成菜谱，存进家庭食谱本。
> **Recommend** = 走进厨房，冰箱里有什么菜，推荐你今天该做什么。

### 核心问题域

**OMC Skill Auto-Extract（生成式）**

- **问题**：隐性经验如何变成可复用的显性能力？
- **输入**：用户解决问题的完整 Transcript
- **输出**：一个新的可执行 SKILL.md
- **类比**：公司的知识萃取 → SOP 沉淀
- **消费者**：Agent 运行时（机器消费）

**skill-recommend（检索式）**

- **问题**：面对当前项目，哪些已有能力最匹配？
- **输入**：项目目录的静态特征 + git diff
- **输出**：按相关度排序的推荐列表
- **类比**：App Store 的"为你推荐"
- **消费者**：用户（人类消费）

### Skill 全生命周期

```
Recommend（外部能力发现）或 Auto-Extract（内部能力生成）
  ↓
Install · 写入 .claude/skills/{name}/SKILL.md
  ↓
Registry · config/loader.ts 扫描 → Zod 校验 → 运行时注册
  ↓
Invoke · 编排层意图匹配 → Agent 自动调用 / 用户手动 /skill-name
  ↓
Feedback · transcript 记录 → 用量统计 → 优化排序（理想态）
```

### 七维对比矩阵

| 维度 | OMC Auto-Extract（生成） | skill-recommend（检索） |
|------|------------------------|----------------------|
| **设计模式** | Knowledge Distillation（知识蒸馏） | Context-Aware Recommendation（上下文推荐） |
| **智能类型** | **生成式** — 从过程抽象出新模式 | **检索式** — 从已有目录匹配 |
| **数据流** | Transcript → LLM 抽象 → SKILL.md | 文件系统 → 规则引擎 → stdout |
| **触发时机** | Session 结束 / 任务完成后 | Session 启动时（SessionStart hook） |
| **作用域** | 两级：项目级 + 用户级 | 三层：本地 → 精选 → 全网 |
| **安全模型** | 强制 — allowed-tools 白名单 + Zod 校验 | 无约束 — 只推荐不执行 |
| **失败影响** | 严重 — 生成低质 Skill 会误导 Agent | 无感 — 推荐不准只是浪费一行文字 |

### 类比矩阵

| 跨域类比 | Auto-Extract | Recommend |
|---------|-------------|---------|
| **餐饮** | 厨师做完菜 → 自动生成标准化菜谱 | 看冰箱食材 → 推荐今天做什么 |
| **软件工程** | 重构后提取 Design Pattern | IDE 的 Plugin Marketplace 推荐 |
| **企业管理** | 项目复盘 → 沉淀 SOP 手册 | 新员工入职 → 推荐该学的文档 |
| **军事** | 实战后编写战术手册 | 出发前查阅武器装备清单 |
| **生物学** | 免疫系统记忆抗体（长期免疫） | 体检报告推荐（你该关注什么） |

---

## Auto-Extract 深度拆解

### 核心架构（生成式）

```
输入层 · Input
  Session Transcript | Tool Call Trace | File Diff History | Task Completion State

提取层 · Extraction (LLM-powered)
  Pattern Recognition | Step Sequencing | Variable Generalization | Error Path Pruning

输出层 · Output
  SKILL.md (Frontmatter + Steps) | allowed-tools Declaration | Scope Assignment (project/user)

注册层 · Registry
  config/loader.ts (Zod) | Skill Registry (Runtime) | Intent Matching (编排层)
```

### 提取流程 · 7 步管线

1. **Transcript 捕获** — `hud/transcript.ts`（24.4KB）解析整个 Session：活跃 Agent、Skill 调用、Tool Call 序列、Token 消耗、Task 完成状态
2. **完成信号触发** — Continuation Enforcement 确认所有 todo completed + 验证通过 → 触发提取分析
3. **模式识别** — 从 transcript 中识别可复用的操作序列：哪些 tool 被调用？什么顺序？关键判断条件是什么？
4. **试错路径剪枝** — 过滤掉失败分支和回溯路径，只保留最终成功的操作链
5. **变量泛化** — 把具体的文件名、表名、变量名替换为 `$ARGUMENTS` 占位符。例如 `users_table` → `$TABLE_NAME`
6. **Skill 生成** — LLM 组装 SKILL.md：frontmatter（name + description + allowed-tools）+ 步骤化 Markdown 指令
7. **作用域写入** — 根据任务性质决定写入位置：项目通用 → `.claude/skills/`（团队共享），个人偏好 → `~/.claude/skills/`（个人沉淀）

### 关键设计决策

**决策 1：能力沉淀 vs 知识管理**

选择了「能力」而非「知识」。Skill 不是"数据库迁移注意事项"这样的文档，而是"如何执行数据库迁移"的可执行步骤。

**为什么**：文档需要人理解后行动，Skill 可以被 Agent 直接执行。编排层在合适时机自动调用，团队成员甚至不需要知道某个 Skill 存在。

**决策 2：两级作用域隔离**

项目级 `.claude/skills/` > 用户级 `~/.claude/skills/`（项目约定覆盖个人习惯）

**为什么**：同一个人在不同项目里，"怎么做测试"的答案完全不同。项目级 Skill 承载团队共识，用户级 Skill 承载个人工具箱。

**决策 3：编排层自动匹配 vs 用户手动调用**

两种调用路径并存：
- **显式**：用户输入 `/skill-name` 手动调用
- **隐式**：编排层分析新任务意图 → 搜索 Skill Registry → 匹配到合适 Skill → 自动注入 Agent 上下文

**为什么**："团队成员不需要知道 Skill 存在"这个设计目标，要求编排层具备意图匹配能力。

**决策 4：最小权限安全模型**

每个 Skill 必须声明 `allowed-tools` 白名单 + `disable-model-invocation: true`。

**为什么**：自动提取的 Skill 未经人工审核就可能被自动调用。如果 Skill 有 full access，一个提取错误的 Skill 可能造成破坏。最小权限是安全兜底。

### Skill 产出物结构

```yaml
---
name: db-migration-safe
description: 安全执行数据库 schema 迁移（含回滚验证）
allowed-tools: Read, Edit, Bash
disable-model-invocation: true
---

# Safe Database Migration

## Step 1: Pre-flight Check
- Read current schema: $DB_SCHEMA_FILE
- Verify no pending migrations

## Step 2: Generate Migration
- Create migration file based on $ARGUMENTS
- Include rollback script

## Step 3: Dry Run
- Execute with --dry-run flag
- Verify expected changes

## Step 4: Apply & Verify
- Apply migration
- Run smoke tests
- Compare schema diff
```

> **架构师洞察**：Auto-Extract 的核心挑战不是"生成 Markdown"，而是**泛化质量**——从一次具体经验中提取出多次可复用的模式。过度泛化丢失关键细节，泛化不足则只对原场景有用。这是一个 LLM 推理难题。

---

## Recommend 深度拆解

### 核心架构（检索式）

`skill-recommend.py Architecture (509 lines)`

```
信号采集层 · Signal Collection
  语言标志文件 | Python import 扫描 | 产品/设计文件名 | Git diff 变更 | 目录名推断 | 依赖状态检测
  ↓ set[str] 信号集合

匹配引擎 · Matching Engine
  Tag Fuzzy Match | Category Bonus (+2) | Star Weighting (max +5) | Dedup Filter
  ↓ scored & ranked

渐进降级漏斗 · Progressive Fallback
  L1 本地已装 (9) | L2 已启用插件 (16) | L3 精选目录 (42) | L4 GitHub API 兜底
```

### 信号采集详解 · 10 类信号源

| 信号源 | 采集方式 | 产出信号 | 设计考量 |
|--------|---------|---------|---------|
| **语言/框架** | 标志文件存在性检测 | python, nodejs, golang, rust, java | O(1) 查找，最快信号 |
| **AI/ML** | Python 文件内容扫描（前 50 个文件 x 3000 字符） | ai, rag, prompt | 短路优化：找到即停 |
| **产品/设计** | Glob 文件名模式匹配 | product, PRD, wireframe, design | 双层扫描：根目录 + 一级子目录 |
| **写作/内容** | .md 文件计数 + 目录名匹配 | writing, docs, blog | 阈值判断：>10 个 .md 才触发 |
| **数据分析** | 数据文件扩展名 | data, notebook, SQL | 区分细分类型（.ipynb → notebook） |
| **创业/职业** | 特征文件名 Glob | startup, career | 低频信号，精准匹配 |
| **DevOps** | 基础设施配置文件 | devops, docker, CI, k8s | 支持多种 CI 平台 |
| **测试** | 测试文件命名约定 | test | 跨语言：test_*.py, *.test.ts, *_test.go |
| **Git 变更** | `git diff --name-only HEAD` | code, review + 文件类型细分 | 5 秒超时保护 |
| **依赖状态** | Python 项目 + 无 venv 目录 | dependency | 推断需要环境修复 |

### 评分公式

```
score = Σ(tag_match) + category_bonus + star_bonus

  tag ∩ signal    +1 each
+ category ∈ signals  +2
+ min(stars/1000 × 0.5, 5)  max +5
```

### 渐进降级漏斗 · 行动成本递增

1. **本地已安装**（9 个）— 行动成本 = 0，直接 `/cmd` 调用。优先推荐最近的资源
2. **已启用插件**（16 个）— 行动成本 = 0，同样直接可用。去重 L1 避免重复显示
3. **精选目录**（42 个）— 行动成本 = 低（一条安装命令）。Star 加权保证推荐质量
4. **GitHub API 搜索** — 仅当 L1+L2+L3 匹配 < 3 条时才触发。3 天缓存。行动成本最高

### 关键设计决策

**声明式规则引擎**：信号采集用 `{signal: [patterns]}` 字典定义，新增信号只需加一行，不改流程。对扩展开放，对修改封闭。

**10 秒硬约束设计**：SessionStart hook 有 10 秒超时。所有扫描都加了短路优化（`[:1]`、`[:20]`、`[:3000]`），GitHub API 限 1 次请求。

**模糊匹配容错**：`tag in sig or sig in tag` — 允许子串匹配，覆盖面广但可能误匹配（如 "ai" 匹配 "repair"）。

**Star 权重上限**：每 1000 星 +0.5 分，上限 +5。防止 superpowers（142k星）霸榜，给小而精的 Skill 曝光机会。

> **架构师洞察**：整个系统是一个**零依赖的单文件 Python 脚本**（509 行），不引入任何第三方库。这是 hook 脚本的最佳实践——启动快、无安装成本、故障隔离。

---

## 架构决策对比

### 输入源设计

| 维度 | Auto-Extract | Recommend |
|------|-------------|---------|
| **输入** | 完整 Session Transcript | 项目目录静态特征 |
| **深度** | 深 — 看到每一步工具调用、决策、回溯 | 浅 — 只看文件名、扩展名、前 3000 字符 |
| **时态** | 事后分析（Session 结束后） | 即时分析（Session 开始前） |
| **代价** | 高 — 需要 LLM 推理 + Token 消耗 | 低 — 纯规则引擎，无 LLM 调用 |

### 匹配策略

**Auto-Extract：语义匹配**
- 编排层分析新任务意图
- 搜索 Skill Registry 找语义匹配项
- 自动注入 Agent 上下文
- **用户无感**，不需要知道 Skill 存在

**Recommend：标签匹配**
- 信号集合 ∩ Skill 标签集合
- 子串模糊匹配 + 类别加权 + Star 加权
- 输出排序列表到 stdout
- **用户决策**，看到推荐后自行选择

### 安全边界

**Auto-Extract 的安全挑战**：自动生成的 Skill 可能被自动调用 → 必须有运行时强制约束：
- `allowed-tools` 白名单（最小权限）
- `disable-model-invocation`（禁止自主推理）
- Zod schema 强校验
- Agent 名称白名单（防路径穿越）
- 4000 字符截断（untrusted 内容）

**Recommend 的安全模型**：只推荐不执行 → 安全要求极低：
- 最坏情况：推荐了一个恶意 Skill
- 但用户需要手动安装才会生效
- 人在环中（Human-in-the-loop）是天然安全屏障
- GitHub API 调用有 5 秒超时兜底

### 扩展机制

**Auto-Extract：自增长**：每次成功解决问题 → 可能产出新 Skill。系统的能力池**自动增长**。

**风险**：Skill 膨胀——大量低质 Skill 污染 Registry，增加匹配噪声。需要定期清理或质量评分机制。

**Recommend：人工维护**：CURATED_CATALOG 是 Python 硬编码数组（42 条）。新增推荐需要改代码。

**风险**：目录过时——不追踪 repo 是否还维护、star 是否真实。需要外部化为 JSON + 定期拉取更新。

### 状态管理对比

| 维度 | Auto-Extract | Recommend |
|------|-------------|---------|
| **持久化存储** | SKILL.md 文件 + .omc/state/jobs.db (SQLite) | ~/.claude/hooks/cache/web-skills-cache.json |
| **Skill 本体** | 有状态 — Skill 文件一旦写入，永久存在 | 无状态 — 推荐列表每次重新计算 |
| **调用记录** | 有 — transcript 记录了哪些 Skill 被调用 | 无 — 不知道用户是否采纳推荐 |
| **反馈闭环** | 有 — Skill 调用结果可回流优化提取质量 | 无 — 推荐后无反馈信号 |

### 复杂度对比

| 指标 | Auto-Extract | Recommend |
|------|-------------|---------|
| **代码规模** | ~200 源文件，核心 config/loader.ts 26.2KB | 单文件 509 行 Python |
| **依赖** | TypeScript + Zod + SQLite + MCP 协议 | 零依赖（Python 标准库） |
| **LLM 需求** | 必需 — 提取过程需要 LLM 推理 | 不需要 — 纯规则引擎 |
| **延迟要求** | 宽松 — 异步后台处理 | 严格 — 10 秒 hook 超时 |
| **失败代价** | 高 — 低质 Skill 误导 Agent | 零 — 静默退出，用户无感 |

---

## 统一模型

Auto-Extract 解决**能力生成**（供给侧），Recommend 解决**能力发现**（需求侧）。将两者统一，就是一个完整的 **Skill 平台**——npm 的注册/加载 + App Store 的推荐算法。

### 理想架构 · Unified Skill Platform

```
供给侧 · Supply
  Auto-Extract (内部沉淀) | Manual Author (人工编写) | Community Publish (社区发布)
  ↓
注册中心 · Registry
  Schema Validation (Zod) | Security Audit | Quality Scoring | Version Management
  ↓
需求侧 · Demand
  Context Signal Collector | Intent Matching (编排层) | Recommendation Engine | Auto Install / Invoke
  ↓
反馈环 · Feedback Loop
  Usage Analytics | Success/Fail Tracking | Quality Decay Detection | Auto Deprecation
```

### Gap 分析

| 能力 | 当前状态 | 统一模型需要 | Gap |
|------|---------|-----------|-----|
| **供给：内部沉淀** | OMC Auto-Extract 实现 | 已有 | - |
| **供给：外部引入** | skill-recommend 推荐 | 已有（但需要 auto-install） | 中 |
| **注册：Schema 校验** | OMC config/loader.ts + Zod | 已有 | - |
| **注册：质量评分** | recommend 用 star 代理 | 需要基于使用数据的评分 | 大 |
| **需求：上下文匹配** | recommend 的信号采集 | 需要融合 transcript 意图 | 中 |
| **需求：自动调用** | OMC 编排层意图匹配 | 已有 | - |
| **反馈：Usage Analytics** | OMC transcript 有调用记录 | 需要跨系统聚合 | 大 |
| **反馈：Auto Deprecation** | 不存在 | 长期无人用 → 自动降权/归档 | 大 |

### 实战迁移

1. **已有的 retro Skill 就是手动版 Auto-Extract** — 复盘近期对话，发现可自动化操作，手动总结成新 Skill。可以进化为自动触发
2. **skill-recommend 已覆盖"发现"链路** — 三层漏斗 + GitHub 兜底。下一步可加"安装确认"交互，从推荐直接到安装
3. **反馈闭环是最大缺口** — 可以在 Stop hook 中记录本次 session 调用了哪些 Skill，写入 JSON 日志。积累数据后用于优化推荐排序
4. **质量评分可从 Skill 调用成功率开始** — Skill 调用后任务完成 = 成功，调用后回滚/手动修复 = 失败。简单二分就够了

---

## 误解雷达

**✗ 误解 1：Auto-Extract 就是"扫描目录注册 Skill"**

扫描目录注册是 `config/loader.ts` 的工作，那只是 Skill **加载**机制。Auto-Extract 的核心是从用户的问题解决**过程中生成新 Skill**——输入是 transcript，输出是 SKILL.md 文件。加载是装弹，提取是造弹。

**✗ 误解 2：Skill 等于文档/最佳实践**

Skill 传递的是**能力**（how to do），不是知识（what to know）。CLAUDE.md 传递上下文（why & what），Skill 传递可执行方案。一个是地图，一个是导航指令。文档需要人理解后行动，Skill 可以被 Agent 直接执行。

**✗ 误解 3：Recommend 和 Auto-Extract 是同一类系统**

一个是**检索**问题（从已有集合中找最匹配的），一个是**生成**问题（从经验中创造新的）。复杂度差一个数量级——Recommend 是 509 行 Python 规则引擎，Auto-Extract 需要 LLM + Transcript 分析 + 泛化推理。

**✗ 误解 4：共享 Skill = 共享能力**

新成员有 Skill 但没读 CLAUDE.md，照样会做出错误决策。Skill 只传递 "怎么做"，不传递 "为什么这样做" 和 "什么时候不该做"。**能力 + 上下文 = 真正的能力转移**。

**✗ 误解 5：Star 数 = Skill 质量**

skill-recommend 用 GitHub star 做质量代理指标，但 star 反映的是**知名度**而非**适用性**。142k star 的 superpowers 未必适合你的 RAG 项目。真正的质量信号应该来自**使用数据**——调用频率、成功率、用户留存。

### 正确心智模型

**✓ Auto-Extract = 组织记忆**：每个 Skill 是组织的"肌肉记忆"。就像骑自行车——一旦学会，身体自动执行，不需要每次重新思考。Agent 调用 Skill 时，就是在使用组织沉淀的肌肉记忆。

**✓ Recommend = 环境感知**：像走进一个新房间，快速扫描环境（文件、代码、git状态），判断"这里需要什么能力"。不创造能力，只连接需求和已有供给。

### 两者互补的完整闭环

```
Recommend：发现外部 Skill（解决冷启动）
  ↓ 用户安装
Registry：加载到运行时
  ↓ Agent 使用
Invoke：执行 Skill 解决问题
  ↓ 过程被记录
Auto-Extract：从新经验中沉淀新 Skill（解决经验流失）
  ↓ 写入 Registry
Registry：能力池扩大
  ↓ 下次 Session
Recommend：推荐时包含自动提取的 Skill
```

> **一句话总结**：Recommend 是**外循环**（引入外部能力），Auto-Extract 是**内循环**（沉淀内部经验）。两个循环叠加，形成一个自我增强的能力飞轮。
