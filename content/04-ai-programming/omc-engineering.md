---
title: OMC 工程架构拆解
description: 从源码视角拆解 oh-my-claudecode 的系统架构、核心机制、模块边界和运行逻辑。TypeScript 实现，~200 源文件，编译后主入口 3MB。
---

# OMC 工程架构拆解

从源码视角拆解 oh-my-claudecode 的**系统架构、核心机制、模块边界和运行逻辑**。TypeScript 实现，~200 源文件，编译后主入口 3MB。

---

## 四层架构总览

**OMC System Architecture**

```
L4 编排层 · Orchestration
  Magic Keywords | Delegation Enforcer | Continuation Enforcement | Mode Controller | System Prompt Assembly

L3 Agent 层 · Agents
  构建通道：explore(H) | analyst(O) | planner(O) | architect(O) | debugger(S) | executor(S) | verifier(S)
  审核通道：security-reviewer(S) | code-reviewer(O)
  领域通道：test-engineer(S) | designer(S) | writer(H) | git-master(S) | code-simplifier(O)
  产品通道 + 协调：product-manager(S) | ux-researcher(S) | critic(O)
  H=Haiku  S=Sonnet  O=Opus

L2 能力层 · Skills & Config
  Skill Auto-Extract | Builtin Skills | Plugin Dir | CLAUDE.md Loader | Config (Zod)

L1 基础设施层 · Infrastructure
  HUD Renderer | Job State DB (SQLite) | MCP Servers | Background Tasks | Git Worktree | Atomic Write | File Lock
```

### 模型路由策略

```
User Task Input
  ↓
Delegation Enforcer · 检查 Agent 定义中的 model 字段
  ↓
Model Normalization · claude-sonnet-4-6 → sonnet
  ↓
  ┌─────────────┬──────────────────┬───────────────┐
  Haiku          Sonnet              Opus
  explore,writer executor,debugger   architect,analyst
  分类/搜索/文档  编码/调试/测试      架构/分析/审核
  ↓
Force Inherit 模式（Bedrock/Vertex）：剥离 model 参数，继承用户配置
```

### 执行模式矩阵

| 模式 | 触发关键词 | 编排策略 | 并发模型 | 状态文件 |
|------|-----------|---------|---------|---------|
| **Team** | team | 管线式多 Agent 协作 | Worker 池 + Dispatch Queue | .omc/state/team-state.json |
| **Autopilot** | autopilot | 单 Agent 自主执行 | 顺序执行 | .omc/state/autopilot-state.json |
| **Ralph** | ralph | 执行 + 验证循环 | 顺序 + 回溯 | .omc/state/ralph-state.json |
| **Ultrawork** | ulw, uw | 最大并行处理 | BackgroundTaskManager (max 5) | .omc/state/ultrawork-state.json |
| **Ralplan** | ralplan | 规划导向模式 | Planner → Executor 链 | .omc/state/ralplan-state.json |

---

## 核心机制

### 机制 1 · Magic Keywords 魔法关键词

`src/features/magic-keywords.ts (18.5 KB)`

**作用**：拦截用户输入，检测关键词，激活对应模式增强。

**实现细节**：
- 代码感知模式匹配 —— 先剥离反引号代码块，防止代码中的变量名误触发
- 80 字符上下文窗口 —— 过滤教育类查询（"what is", "how to", "explain"）
- 正则转义防注入 —— 用户不能通过构造关键词注入指令
- 多语言支持 —— 10+ 种语言的关键词匹配

| 关键词 | 激活模式 | 注入行为 |
|--------|---------|---------|
| `ultrawork` / `ulw` | Ultrawork | 注入 "MUST LEVERAGE ALL AVAILABLE AGENTS" + 启用后台任务 |
| `search` / `find` | Search | 并行启动 explore + document-specialist |
| `analyze` / `investigate` | Analyze | 先 gather context，再 deep investigation |
| `ultrathink` / `think` | Ultrathink | 激活 extended reasoning，跳过简单查询 |

### 机制 2 · Delegation Enforcer 委派执行器

`src/features/delegation-enforcer.ts (10.1 KB)`

**作用**：拦截所有 Agent 调用，注入正确的模型参数。

**工作流**：
1. 拦截 Task/Agent 调用
2. 检查是否已有 model 参数
3. 若缺失 → 从 Agent 定义中读取默认模型
4. 标准化模型名 → `claude-sonnet-4-6` → `sonnet`
5. 检测 Bedrock/Vertex 环境 → 启用 Force Inherit（剥离 model 参数）
6. 应用 modelAliases 配置（如有）

**缓存策略**：按环境变量状态缓存配置，环境变化时重新生成。

### 机制 3 · Continuation Enforcement 任务续跑

`src/features/continuation-enforcement.ts (7.1 KB)`

**作用**：防止 Agent 在任务未完成时停止。

**工作流**：
1. Hook 拦截 "Stop" 事件
2. 检查任务完成状态（所有 todo 是否 completed）
3. 若有未完成项 → 阻止停止，注入持续提醒
4. 验证清单：todo 全完成 + 功能已验证 + 测试通过 + 无报错 + 代码质量可接受

### 机制 4 · Background Task Manager 后台任务

`src/features/background-tasks.ts (10.7 KB)`

**并发模型**：最大 5 个并行后台任务。

**决策逻辑**（模式匹配判断操作类型）：
- 长运行操作（npm install / docker build / 大型测试）→ `run_in_background: true`
- 快速操作（git status / ls / cat）→ 立即执行
- 结果获取 → `TaskOutput` 工具轮询

**状态持久化**：`.omc/state/jobs.db`（SQLite WAL 模式），按 worktree 隔离，24 小时自动清理终态任务。

### 机制 5 · Verification System 验证系统

`src/verification/tier-selector.ts (3.8 KB) + 测试 (11.2 KB)`

**作用**：根据任务复杂度选择验证等级。

- 验证 Agent（verifier）收集完成证据
- 测试代码量是实现代码的 3 倍——说明验证逻辑本身被严格测试
- 与 Continuation Enforcement 联动：验证不通过 → 阻止停止

### 机制 6 · Prompt Assembly 提示词组装

`src/agents/prompt-helpers.ts (8.6 KB) + prompt-sections/`

**分层组装流程**：
1. 基础编排指令（XML 分隔）
2. 文件上下文（标注 untrusted 警告）
3. 用户提示词（主请求）
4. 以双换行拼接

**安全机制**：
- XML 标签转义（防止 prompt injection）
- 截断到 4000 字符（untrusted 内容）
- Surrogate pair 校验
- Agent 名称只允许字母数字 + 连字符（防止路径穿越）

---

## 模块拆解

### 源码目录结构

```
src/
├── index.ts (11.7KB)          ← 主入口 createOmcSession()
│
├── agents/                     ← Agent 系统（20+ 角色）
│   ├── types.ts (4.3KB)         AgentConfig / FullAgentConfig 类型
│   ├── definitions.ts (16.2KB)  所有 Agent 配置（模型/工具/触发器）
│   ├── utils.ts (11.4KB)        加载 / 委派表 / 深度合并
│   ├── prompt-helpers.ts (8.6KB) 提示词组装 + 安全清理
│   ├── prompt-sections/         模块化提示词片段
│   └── [agent].ts               各 Agent 的专属逻辑
│
├── features/                   ← 核心特性模块
│   ├── magic-keywords.ts (18.5KB)      关键词检测 + 模式激活
│   ├── delegation-enforcer.ts (10.1KB) 模型路由注入
│   ├── continuation-enforcement.ts     任务续跑保障
│   ├── background-tasks.ts (10.7KB)    后台任务管理
│   ├── auto-update.ts (37.9KB)         版本管理（最大文件）
│   └── [placeholders]/                model-routing/ rate-limit-wait/ ...
│
├── hud/                        ← 仪表盘系统（最复杂子系统）
│   ├── index.ts (19.3KB)       主入口 + 状态聚合
│   ├── types.ts (26.4KB)       30+ 可配置元素 + 5 种预设
│   ├── usage-api.ts (29.7KB)   Rate limit 双路径上报
│   ├── transcript.ts (24.4KB)  Session 解析（Agent/Skill/Token）
│   ├── render.ts (18KB)        3 区域渲染（line1/main/detail）
│   └── mission-board.ts (21.4KB) 任务面板
│
├── team/                       ← Team 模式协调（20+ 文件）
│   ├── runtime[-v2].ts          Worker 生命周期
│   ├── dispatch-queue.ts        任务分发队列
│   ├── inbox-outbox.ts          异步消息
│   ├── message-router.ts        角色路由
│   ├── phase-controller.ts      阶段控制器
│   ├── worker-health.ts         健康监控 + 心跳
│   ├── merge-coordinator.ts     Git 合并冲突解决
│   └── git-worktree.ts          隔离工作目录
│
├── mcp/                        ← MCP 协议层
│   ├── job-management.ts (27KB) 核心复杂度（最大单文件）
│   ├── standalone-server.ts     单机部署
│   ├── team-server.ts           团队部署
│   └── prompt-injection.ts      注入防护
│
├── lib/                        ← 基础库
│   ├── job-state-db.ts (23.5KB) SQLite 持久化
│   ├── worktree-paths.ts (27.7KB) Git worktree 管理
│   ├── atomic-write.ts          安全写入
│   ├── file-lock.ts             并发锁
│   └── shared-memory.ts         IPC 共享内存
│
├── config/                     ← 配置系统
│   ├── loader.ts (26.2KB)       解析 + 校验
│   └── models.ts (10.7KB)       Zod Schema 定义
│
└── bridge/                     ← 编译产物
    ├── cli.cjs (3MB)            主 CLI 入口
    ├── mcp-server.cjs (888KB)   MCP 服务器
    ├── team-mcp.cjs (657KB)     Team MCP
    └── gyoshu_bridge.py (32KB)  Python 桥接
```

### 复杂度热力图（按文件大小）

| 模块 | 最大文件 | 大小 | 复杂度说明 |
|------|---------|------|---------|
| **features/** | auto-update.ts | 37.9 KB | 版本管理逻辑最复杂 |
| **hud/** | usage-api.ts | 29.7 KB | 双路径 rate limit + 多 provider |
| **lib/** | worktree-paths.ts | 27.7 KB | Git worktree 的各种边界情况 |
| **mcp/** | job-management.ts | 27.0 KB | 异步任务生命周期管理 |
| **config/** | loader.ts | 26.2 KB | 配置解析 + 校验 + 初始化 |
| **agents/** | definitions.ts | 16.2 KB | 20+ Agent 完整定义 |

---

## 运行逻辑

### 主循环 · 从用户输入到输出

```
User Input (Natural Language)
  ↓
Magic Keyword Detection
  剥离代码块 → 正则匹配 → 过滤教育类查询
  ↓
System Prompt Assembly
  base + continuation + context injection + mode enhancements
  ↓
Agent Delegation Router
  buildDelegationTable() → 模式匹配 → 路由到专业 Agent
  ↓
Model Selection
  Agent 定义默认值 → Delegation Enforcer 标准化 → 用户 override
  ↓
  Sequential (dependent tasks)   or   Parallel (BackgroundTaskManager, max 5)
  ↓
Job State Persistence
  .omc/state/jobs.db (SQLite WAL, per-worktree)
  ↓
Continuation Enforcement
  检查 todo 完成状态 → 未完成则阻止 Stop
  ↓
Verification
  tier-selector 选择验证等级 → verifier 收集证据
  ↓
HUD Update + Output
```

### 初始化流程 · createOmcSession()

1. **加载 Agent 定义** — 解析 `types.ts` schema，合并用户 override
2. **配置模型路由** — 确定每个 Agent 的模型层级，加载 Delegation Enforcer
3. **初始化 MCP 服务器** — Standalone 或 Team 模式，配置 Job Management
4. **构建编排提示词** — Agent 委派表 + 触发器定义 + 类别指引 + Prompt Sections 组装
5. **就绪** — Magic Keyword 处理器激活 + Background Task Manager 运行 + HUD 渲染启用 + Continuation Enforcement 监视

### Agent 生命周期

```
Load Definition
  → Read Prompt (/agents/{name}.md)
  → Merge Overrides
  → Validate Name (alphanumeric+hyphen)
  → Parse Frontmatter (disallowedTools)
  → Security Check (path traversal)
  → FullAgentConfig
```

### HUD 渲染管线

1. **数据采集**（并行）— 读取 OMC 状态 + 查询 job-state-db + 获取 rate limit + 解析 mission board
2. **Transcript 分析** — 提取活跃 Agent / Skill 调用次数 / todo 完成率 / Token 用量 / Session 健康度
3. **渲染引擎** — 加载预设 (minimal/focused/full/dense) → 应用自定义元素 → 自动检测终端宽度 → 渲染 3 区域 (line1/main/detail)
4. **Fire-and-forget** — 异步 spawn session-summary 脚本，PID 存活检测，时间戳节流

---

## Team 模式

### Team 模式架构

```
协调层 · Coordination
  Phase Controller | Dispatch Queue | Message Router | Allocation Policy | Leader Nudge

Worker 层 · Execution
  Worker Bootstrap | Runtime v2 | Inbox / Outbox | Task Router

隔离层 · Isolation
  Git Worktree (per worker) | Merge Coordinator | State Paths (distributed)

观测层 · Observability
  Worker Health + Heartbeat | Activity Log | Audit Log | Team Status | Monitor
```

### Team 模式运行流程

1. **Worker Bootstrap** — 创建 Git worktree（每个 Worker 独立目录），初始化状态文件
2. **任务分发** — Dispatch Queue 接收任务 → Message Router 按角色分配 → Allocation Policy 按能力 + 负载均衡
3. **并行执行** — 每个 Worker 获取任务切片，Heartbeat 监控存活，Activity Log 记录进度
4. **阶段协调** — Phase Controller 控制顺序阶段完成，Merge Coordinator 解决 Git 冲突
5. **状态汇聚** — Inbox/Outbox 分发状态更新 → 持久化到共享状态文件 → Team-Job Convergence 检查
6. **完成** — Audit Log 生成 → Status Report 编译 → 结果聚合

### 关键工程决策

**Git Worktree 隔离**：每个 Worker 在独立的 worktree 中工作，避免文件冲突。合并时通过 Merge Coordinator 统一处理。`lib/worktree-paths.ts` (27.7KB) 处理各种边界情况。

**Heartbeat 存活检测**：Worker 定期发送心跳。若心跳超时，系统判定 Worker 死亡，其任务重新分配给其他 Worker。防止死锁。

**Dispatch Queue + Allocation Policy**：不是简单轮询，而是基于 Worker 能力和当前负载的智能分配。Agent 类型匹配 + 负载均衡。

**Phase Controller**：确保阶段之间的顺序一致性。Phase 1 的所有 Worker 完成后，才启动 Phase 2。防止依赖未就绪的竞态条件。

### 安全架构

**多层防御体系**：

- **输入层** — XML 标签转义 + Surrogate pair 校验 + 4000 字符截断
- **Agent 层** — 名称白名单（字母数字+连字符）+ 路径穿越检测 + 解析后路径校验
- **MCP 层** — Prompt injection 防护（`mcp/prompt-injection.ts`）+ Untrusted 内容标记
- **配置层** — Zod schema 校验 + 环境变量控制 + 文件锁并发保护
- **隔离层** — Per-worktree 状态隔离 + Team 模式用户隔离 + Session 边界
