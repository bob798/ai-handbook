---
title: iTerm2 使用指导
description: macOS 上最强大的终端模拟器——从安装配置到 Shell Integration、高级功能、tmux 集成的完整指导。
---

# iTerm2 使用指导

macOS 上最强大的终端模拟器 — 从入门到高效

---

## 安装与基础操作

### 安装

```bash
# Homebrew（推荐）
brew install --cask iterm2

# 或从官网下载 https://iterm2.com/downloads.html
```

### 首次启动建议

| 设置项 | 路径 | 推荐值 |
|--------|------|--------|
| 外观主题 | Appearance → General → Theme | Minimal |
| 字体 | Profiles → Text → Font | JetBrains Mono Nerd Font, 14pt |
| 配色方案 | Profiles → Colors → Color Presets | Catppuccin / Dracula |
| 光标样式 | Profiles → Text → Cursor | Vertical Bar + Blinking |
| 无限回滚 | Profiles → Terminal → Scrollback | Unlimited scrollback |
| 关闭确认 | Settings → General → Closing | 取消 Confirm closing |

> **NERD FONT**：使用 Nerd Font 可确保 Oh My Zsh、Starship、Powerlevel10k 等主题的图标正常显示。
> 安装：`brew install font-jetbrains-mono-nerd-font`

### 标签页与会话

| 操作 | 快捷键 |
|------|--------|
| 新建标签页 | `⌘` + `T` |
| 关闭标签页 | `⌘` + `W` |
| 切换到第 N 个标签页 | `⌘` + `数字` |
| 前/后一个标签页 | `⌘` + `←` / `→` |
| 新建窗口 | `⌘` + `N` |

### 文本操作

| 操作 | 快捷键 |
|------|--------|
| 复制 | `⌘` + `C`（或开启 Copy on selection） |
| 粘贴 | `⌘` + `V` |
| 粘贴历史 | `⌘` + `⇧` + `H` |
| 清屏 | `⌘` + `K` |
| 放大/缩小字号 | `⌘` + `+` / `-` |
| 选词 / 选行 | 双击 / 三击 |
| 矩形选择 | `⌘` + `⌥` + 拖拽 |

> **SMART CLICK**：按住 `⌘` 点击文件路径或 URL 可直接打开——这是 iTerm2 的**智能点击**功能。

---

## 分屏与 Profile 管理

### 分屏操作

| 操作 | 快捷键 |
|------|--------|
| 水平分屏 | `⌘` + `D` |
| 垂直分屏 | `⌘` + `⇧` + `D` |
| 在分屏间切换 | `⌘` + `⌥` + `方向键` |
| 关闭当前面板 | `⌘` + `W` |
| 最大化当前面板 | `⌘` + `⇧` + `Enter` |
| 交换面板位置 | 拖拽面板标题栏 |
| 向所有面板广播输入 | `⌘` + `⌥` + `I` |

> **WARNING**：**广播输入**（`⌘` + `⌥` + `I`）非常适合同时操作多台服务器，但务必注意当前广播范围，避免误操作。可通过菜单 Shell → Broadcast Input 精确控制范围。

### Profile — 多环境管理

| Profile | 用途 |
|---------|------|
| **Default** | 日常开发。深色主题 + 透明度 10% + blur，工作目录设为项目根目录 |
| **SSH Remote** | 远程服务器专用。红色标签标记 + 不同配色，一眼区分本地/远程 |
| **Presentation** | 演示/分享屏幕时用。大字号 (20pt) + 高对比度 + 不透明背景 |
| **Hotkey** | 全局呼出终端。透明度 15% + Blur + Full-Width Top of Screen |

> **QUICK OPEN**：在 Keys → Key Bindings 中，添加快捷键 → Action 选择 "New Tab with Profile"，即可一键打开特定环境。

### 动态 Profile（版本可控）

```json
// ~/Library/Application Support/iTerm2/DynamicProfiles/dev.json
{
  "Profiles": [{
    "Name": "DevServer",
    "Guid": "dev-server-001",
    "Badge Text": "DEV",
    "Initial Text": "ssh dev-server",
    "Tags": ["remote", "dev"]
  }]
}
```

### Hotkey Window — 全局呼出终端

1. **创建 Hotkey Profile** — 新建 Profile（如 "Hotkey"），进入 Keys → Hotkey Window
2. **配置快捷键** — 勾选 "A hotkey opens a dedicated window with this profile"，设置快捷键（推荐 `⌥` + `Space`）
3. **调整外观** — 勾选 Floating window 置顶。Style 设为 Full-Width Top of Screen，行数 25-30，透明度 15-20%，Blur 半径 20

---

## Shell Integration

### 安装

```bash
# 自动检测 bash/zsh/fish
curl -L https://iterm2.com/shell_integration/install_shell_integration.sh | bash

# 或手动：iTerm2 → Install Shell Integration
```

### 解锁的功能

| 功能 | 说明 |
|------|------|
| **命令历史导航** | `⌘` + `⇧` + `;` 打开最近命令列表，支持搜索和重新执行 |
| **目录历史** | `⌘` + `⌥` + `/` 打开最近访问的目录列表，快速跳转 |
| **命令状态标记** | 每条命令旁显示蓝色三角（成功）或红色三角（失败），左侧边栏一目了然 |
| **上传/下载文件** | 拖拽文件到终端自动上传。远程通过 `it2dl` / `it2ul` 传输 |
| **捕获命令输出** | `⌘` + `⇧` + `A` 选取上一条命令的完整输出，无需手动框选 |
| **Alert on Finish** | Edit → Marks and Annotations → Alert on Next Mark，长时间命令结束后弹通知 |

### 搜索与回滚

| 操作 | 快捷键 |
|------|--------|
| 搜索终端输出 | `⌘` + `F` |
| 搜索支持正则 | 点击搜索栏右侧 `.*` 图标 |
| 上翻/下翻搜索结果 | `⌘` + `G` / `⌘` + `⇧` + `G` |
| 即时回放（Instant Replay） | `⌘` + `⌥` + `B` |
| 查看时间戳 | View → Show Timestamps |

> **INSTANT REPLAY**：像播放视频一样回看终端历史，用方向键逐帧浏览。非常适合回溯刚才错过的输出。
> 默认缓存 4MB，可在 Settings → General → Instant Replay 中调大。

---

## 高级功能

### Triggers — 自动化

对终端输出进行正则匹配并自动执行动作。路径：Profiles → Advanced → Triggers。

| 场景 | 正则表达式 | Action |
|------|-----------|--------|
| 高亮 ERROR 日志 | `(?i)\berror\b` | Highlight Text（红色） |
| 密码提示自动响应 | `(?i)password:` | Open Password Manager |
| 构建完成通知 | `BUILD (SUCCESS\|FAILED)` | Post Notification |
| 标记生产部署 | `DEPLOY.*(?:prod\|production)` | Set Mark + Annotate |

### 自定义快捷键映射

| 快捷键 | Action | 用途 |
|--------|--------|------|
| `⌥` + `←` | Send Escape Sequence: b | 按词左移光标 |
| `⌥` + `→` | Send Escape Sequence: f | 按词右移光标 |
| `⌥` + `Delete` | Send Hex Code: 0x17 | 删除前一个词 |

> **SIMPLER WAY**：更简单的方案：在 Profiles → Keys → General 中将 Left/Right Option Key 设为 **Esc+**，`⌥` 就能直接作为 Meta 键使用，兼容性更好。

### Badge（角标水印）

```bash
# Profiles → General → Badge
# 显示当前会话名和主机名作为半透明水印
\(session.name) @ \(hostname)
```

### 命令补全

`⌘` + `;` 根据当前终端内容智能补全，无需安装额外插件。

### Status Bar

Profiles → Session → Status bar enabled。可添加组件：当前目录、Git 分支、CPU/内存占用、当前任务（running job）、用户名@主机名、自定义脚本组件（通过 Python API）。

### Python API

```python
# 启用：iTerm2 → Settings → General → Magic → Enable Python API
# pip install iterm2

import iterm2

async def main(connection):
    app = await iterm2.async_get_app(connection)
    window = app.current_terminal_window

    # 创建标签页
    tab = await window.async_create_tab()
    session = tab.current_session

    # 水平分屏
    right = await session.async_split_pane(vertical=True)

    # 左侧运行编辑器
    await session.async_send_text('nvim .\n')

    # 右侧再垂直分两栏
    bottom_right = await right.async_split_pane(vertical=False)

    # 右上：dev server
    await right.async_send_text('npm run dev\n')

    # 右下：git log
    await bottom_right.async_send_text('git log --oneline -20\n')

iterm2.run_until_complete(main)
```

> **SCRIPTS**：通过 Scripts → Manage → New Python Script 创建自动加载脚本。"Basic" = 一次性脚本，"Long-Running Daemon" = 常驻后台服务。

---

## tmux 集成

iTerm2 的 **-CC 集成模式**将 tmux 的面板/窗口映射为原生的标签页和分屏，获得原生体验同时保留 tmux 的持久化能力。

### tmux 集成模式命令

```bash
# 以集成模式启动（关键是 -CC 参数）
tmux -CC

# 连接已有 session
tmux -CC attach -t mysession

# 远程服务器上也可以
ssh myserver -t 'tmux -CC attach || tmux -CC'
```

### 普通 tmux vs 集成模式

| 普通 tmux | iTerm2 -CC 集成 |
|----------|----------------|
| 状态栏占空间 | 映射为原生标签页 |
| 需记忆 prefix 快捷键 | 用 `⌘`+`D` / `⌘`+`T` 操作 |
| 无法原生滚动回看 | 原生滚动 + 搜索 |
| 复制粘贴繁琐 | 原生 `⌘`+`C` / `⌘`+`V` |
| 断开即不可见 | 断开后重连恢复所有窗口 |

> **CONFIG**：在 Settings → General → tmux 中配置集成行为，如 "Automatically bury the tmux client session" 隐藏控制会话。

---

## 推荐配置清单

### 核心配置

| 配置项 | 路径 | 推荐值 |
|--------|------|--------|
| Option 键行为 | Profiles → Keys → General | Left Option: Esc+ |
| 选中即复制 | Settings → General → Selection | Copy to pasteboard on selection |
| 焦点跟随鼠标 | Settings → Pointer | Focus follows mouse |
| Tab 标题 | Profiles → General → Title | Profile + Session Name |
| 语义历史 | Profiles → Advanced | Open with editor + 你的编辑器 |
| GPU 渲染 | Settings → General → Magic | GPU Rendering（默认已开） |
| Dock 隐藏 | Appearance → General | Exclude from Dock（Hotkey Profile） |

> **HIDDEN GEM**：**Semantic History**：按住 `⌘` 点击终端中出现的文件路径（如编译错误中的 `src/app.ts:42`），iTerm2 会用你配置的编辑器直接打开该文件并跳到对应行号。

### 配置导入导出

```bash
# 方式 1：手动导出
cp ~/Library/Preferences/com.googlecode.iterm2.plist ~/dotfiles/

# 方式 2：设置自动同步（推荐）
# Settings → General → Preferences
# 勾选 "Load preferences from a custom folder or URL"
# 设为 Git 仓库路径，实现团队统一配置
```
