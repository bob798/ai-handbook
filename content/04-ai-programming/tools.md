---
title: AI 编程工具篇
description: tmux + iTerm2 + Claude Code——构建高效的 AI 编程终端环境，涵盖终端复用、窗口管理、多 Agent 协作工作流。
---

# AI 编程工具篇

tmux + iTerm2 + Claude Code — 构建高效的 AI 编程终端环境

---

## tmux — 终端复用器

SSH 断连不丢进程、一屏多窗格并行工作、Claude Code 多 Agent 分屏协作的基础设施。AI 编程场景下，tmux 是把"一个终端"变成"一个工作台"的关键。

### 核心概念 · 三层结构

**Session（会话）**：最外层容器。断开终端后 Session 继续运行，重新连接即可恢复。每个项目一个 Session 是好习惯。

**Window（窗口）**：Session 里的"标签页"。底部状态栏显示所有 Window，用编号切换。类比浏览器的 Tab。

**Pane（窗格）**：Window 内的分屏区域。左右分、上下分、随意组合。AI 编程最常用：左边代码，右边 Claude Code。

### 前缀键 · 所有快捷键的入口

tmux 所有快捷键都需要先按**前缀键**，松开后再按功能键。默认前缀是 `Ctrl+b`，但很多配置改为 `Ctrl+a` 或 `Ctrl+s`。

```bash
# 查看你的前缀键
tmux show -g prefix

# 如果前缀键被终端吞掉（按了没反应），运行以下命令禁用流控制
stty -ixon
```

### 会话管理

| 命令 / 快捷键 | 说明 |
|-------------|------|
| `tmux new -s name` | 创建命名会话 |
| `tmux ls` | 列出所有会话 |
| `tmux attach -t name` | 连接到会话 |
| `tmux kill-session -t name` | 关闭会话 |
| `prefix` + `d` | 分离（detach）当前会话，回到原终端 |
| `prefix` + `s` | 会话列表，交互式切换 |
| `prefix` + `$` | 重命名当前会话 |

### 窗口（Window）操作

| 快捷键 | 说明 |
|--------|------|
| `prefix` + `c` | 新建窗口 |
| `prefix` + `,` | 重命名窗口 |
| `prefix` + `w` | 窗口列表（可预览） |
| `prefix` + `n` / `p` | 下一个 / 上一个窗口 |
| `prefix` + `0-9` | 跳转到第 N 个窗口 |
| `prefix` + `&` | 关闭当前窗口 |

### 窗格（Pane）操作 · 最高频

| 快捷键 | 说明 |
|--------|------|
| `prefix` + `%` | 左右分屏（注意：`%` = `Shift+5`） |
| `prefix` + `"` | 上下分屏（`"` = `Shift+'`） |
| `prefix` + `方向键` | 切换窗格焦点 |
| `prefix` + `z` | 当前窗格全屏 / 还原（zoom toggle） |
| `prefix` + `x` | 关闭当前窗格 |
| `prefix` + `{` / `}` | 交换窗格位置 |
| `prefix` + `Space` | 循环切换布局 |

> **GOTCHA**：`%` 和 `"` 都需要 `Shift` 键！很多新手按不出来就是忘了 Shift。正确操作：先按 prefix 松开，再按 `Shift+5`（即 `%`）。

### 复制模式 · 滚动和搜索

| 快捷键 | 说明 |
|--------|------|
| `prefix` + `[` | 进入复制模式（可上下滚动、搜索） |
| `q` | 退出复制模式 |
| `/` | 在复制模式中搜索 |
| `Space` → 选择 → `Enter` | 选中并复制文本 |
| `prefix` + `]` | 粘贴 |

### 实用命令

```bash
# 调整窗格大小
prefix + :  resize-pane -D 10   # 向下扩展 10 行
prefix + :  resize-pane -R 20   # 向右扩展 20 列

# 同步输入到所有窗格（批量操作多台机器）
prefix + :  setw synchronize-panes on

# 保存窗格输出到文件
prefix + :  capture-pane -S -3000 ; save-buffer ~/tmux.log

# 查看所有快捷键绑定
tmux list-keys

# 查看分屏相关绑定
tmux list-keys | grep split
```

---

## iTerm2 — macOS 终端增强

让 iTerm2 和 tmux 完美配合的关键配置。

### 常见坑 · 快捷键被吞

iTerm2 可能拦截 tmux 的前缀键（如 `Ctrl+s` 或 `Ctrl+b`），导致 tmux 收不到指令。

**症状**：按前缀键后终端无反应，或屏幕冻住（`Ctrl+s` 触发了 XOFF 流控制）。

### 排查步骤

1. **验证按键是否到达终端**：运行 `cat -v`，按 `Ctrl+b`。如果显示 `^B` 说明终端收到了；如果没输出，说明被 iTerm2 拦截。
2. **检查 iTerm2 快捷键设置**：Settings → Profiles → Keys — 看是否有绑定冲突。Settings → Keys → Key Bindings — 全局快捷键也要检查。
3. **禁用流控制（针对 Ctrl+s）**：运行 `stty -ixon`。永久生效：加到 `~/.zshrc`。

### 推荐 iTerm2 设置

| 设置项 | 位置 | 建议值 |
|--------|------|--------|
| Unlimited scrollback | Profiles → Terminal | 开启，方便回查长输出 |
| Option as Meta | Profiles → Keys → General | Left Option = Esc+，支持 Alt 快捷键 |
| Shell Integration | Install Shell Integration | 开启，显示命令标记和执行时间 |
| Natural Text Editing | Profiles → Keys → Presets | 按需，让 Option+方向键按单词跳转 |

### iTerm2 原生分屏 vs tmux

| iTerm2 原生分屏 | TMUX 分屏 |
|---------------|-----------|
| **优点**：`Cmd+D` 左右、`Cmd+Shift+D` 上下，更直觉 | **优点**：断连不丢、可脚本化、跨机器一致 |
| **缺点**：SSH 断连后分屏丢失，不可复用 | **缺点**：需要记前缀键，初学门槛稍高 |

> **RECOMMENDATION**：**本地开发用 iTerm2 原生分屏就够了**，简单直觉。需要 SSH 远程、Claude Code 多 Agent 分屏、或持久化会话时，用 tmux。两者可以混用——iTerm2 开多个 Tab，其中一个 Tab 跑 tmux。

---

## Claude Code — AI 编程窗口管理

管理多个 Claude Code 实例的四种方式。

### 方式 1 · Agent Teams（最强大）

多个 Claude Code 实例协作，每个成员有独立窗格。

- **Tmux 分屏模式**：每个团队成员一个 tmux pane，可同时看到所有人的进展。
- **In-process 模式**：同一终端内，按 `Shift+Down` 切换成员。
- **自动协调**：成员共享任务列表，可互相通信。

```json
// settings.json — 启用 Agent Teams
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### 方式 2 · Subagents（轻量并行）

主会话中并行派出多个子代理，结果汇总回主会话。

无需 tmux 配置，适合并行分析、安全扫描、测试执行等场景。Token 成本高于单 Agent，但速度快。

### 方式 3 · Git Worktrees（独立开发）

每个 worktree 对应独立的 git 分支和工作目录。

适合多功能并行开发，文件互不干扰。可手动在不同 tmux pane 中各跑一个 Claude Code 实例。

### 方式 4 · Sessions（会话持久化）

| 命令 | 说明 |
|------|------|
| `/resume` | 恢复历史会话 |
| `/compact` | 压缩当前上下文，释放 token 空间 |

### 场景选择矩阵

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| 多视角代码审查 | Agent Teams + Tmux | 多个 Agent 同时审查不同维度 |
| 并行测试/分析 | Subagents | 轻量快速，无需额外配置 |
| 多功能并行开发 | Git Worktrees | 文件隔离，互不干扰 |
| 长期研究任务 | Sessions | 断点续跑，保持上下文 |

---

## 实战工作流

### 布局 1 · 日常开发（iTerm2 原生）

```
┌─────────────────────┬──────────────────────┐
│                     │                      │
│   Claude Code       │   Editor / Code      │
│   (主工作区)         │   (VSCode / Vim)     │
│                     │                      │
│                     │                      │
├─────────────────────┴──────────────────────┤
│  Terminal  (git / test / server)            │
└────────────────────────────────────────────┘

iTerm2 操作：
  Cmd+D        → 左右分屏
  Cmd+Shift+D  → 上下分屏
  Cmd+[/]      → 切换窗格
```

### 布局 2 · 多 Agent 协作（tmux）

```
┌──────────────┬──────────────┬──────────────┐
│  Agent 1     │  Agent 2     │  Agent 3     │
│  (executor)  │  (reviewer)  │  (tester)    │
│              │              │              │
├──────────────┴──────────────┴──────────────┤
│  Leader Agent / 主控 Claude Code            │
└────────────────────────────────────────────┘

tmux 操作（假设 prefix = Ctrl+s）：
  Ctrl+s  %     → 左右分屏
  Ctrl+s  "     → 上下分屏
  Ctrl+s  方向键 → 切换窗格
  Ctrl+s  z     → 放大/还原某个 Agent
```

### 快速启动脚本

```bash
#!/bin/bash
# ai-workspace.sh — 一键搭建工作环境

SESSION="ai-dev"

# 创建新会话
tmux new-session -d -s $SESSION

# 窗口 1: Claude Code
tmux rename-window -t $SESSION:0 "claude"

# 窗口 2: 代码编辑
tmux new-window -t $SESSION -n "code"

# 窗口 3: Git + 测试
tmux new-window -t $SESSION -n "git"

# 回到第一个窗口
tmux select-window -t $SESSION:0

# 连接
tmux attach -t $SESSION
```

### 日常高频操作速查

| 快捷键 | 说明 |
|--------|------|
| `prefix` + `%` | 左右分屏（需要 Shift） |
| `prefix` + `"` | 上下分屏（需要 Shift） |
| `prefix` + `方向键` | 切换窗格 |
| `prefix` + `z` | 全屏/还原当前窗格 |
| `prefix` + `d` | 分离会话（后台运行） |
| `Cmd` + `D` | iTerm2 左右分屏 |
| `Cmd` + `Shift+D` | iTerm2 上下分屏 |
