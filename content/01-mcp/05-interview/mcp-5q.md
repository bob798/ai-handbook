---
title: MCP 追问 · 5问
description: MCP 机制深度追问：FC循环控制流、Prompt模板与斜杠命令的关系、动态注册弊端、Function Calling 再理解、JSON Schema 含义。
---

# MCP 追问 · 5问

FC循环机制 · Prompt模板 · 动态注册弊端 · FC再理解 · Schema含义

## Q1: AI 停止后谁触发代码去读取 JSON 执行请求？

**是你的代码自己在控制整个循环，不是 AI 主动通知。**
AI 就是一个普通的 HTTP 接口——你调用它，它返回结果，你的代码判断返回类型决定下一步。AI 停止后什么都不做，就等着你的代码下一次调用它。

### 完整的控制流（你的代码主导）

```javascript
// 1. 你的代码发起调用
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  messages: conversation,
  tools: availableTools       // 告诉 AI 有哪些 Tool 可用
});

// 2. AI 返回响应（同步等待，就像普通 HTTP 请求）
// response.stop_reason 有两种值：
//   "end_turn"   → AI 直接回答了，展示给用户
//   "tool_use"   → AI 要调 Tool，你需要执行

// 3. 你的代码检查 stop_reason，自己决定下一步
if (response.stop_reason === "tool_use") {

  // 4. 从返回值里提取 Tool 调用信息
  const toolCall = response.content.find(b => b.type === "tool_use");
  const { name, input } = toolCall;
  // name = "get_weather", input = { city: "上海" }

  // 5. 你的代码执行对应函数（AI 完全不参与这一步）
  const result = await executeToolCall(name, input);
  // 比如：调天气 API，真的发了 HTTP 请求，拿到了数据

  // 6. 你的代码把结果拼回对话，再次调用 AI
  conversation.push({ role: "user", content: [{
    type: "tool_result",
    tool_use_id: toolCall.id,
    content: JSON.stringify(result)
  }]});

  // 7. 再次调用 AI，AI 用结果生成最终回答
  const finalResponse = await anthropic.messages.create({ ... });

} else {
  // AI 直接回答，展示给用户
  showToUser(response.content[0].text);
}
```

### 两个关键认知

**AI 是被动的 HTTP 服务**
每次"对话"对 AI 来说都是一次独立的 API 调用。AI 不持有连接，不主动推送，不知道上一次调用发生了什么——你的代码每次都要把完整的对话历史重新传给它。

**你的代码是主控方**
决定"要不要继续循环""执行哪个函数""结果怎么处理"的，全是你的代码。AI 只是在每次被调用时输出它的判断，从不主动触发任何事情。

> **面试一句话版：** "Function Calling 不是 AI 主动调用工具，而是 AI 输出结构化的调用意图，由宿主代码（Host）拦截并执行，再把结果传回 AI。AI 是无状态的 HTTP 服务，主控逻辑始终在你的代码里。"

---

## Q2: Prompt 模板是不是就像 Claude Code 里的斜杠命令？

**完全正确，就是同一个机制。**
Claude Code 里的 `/add-dir`、`/review`、`/clear` 这些斜杠命令，就是 MCP Prompt 模板的具体体现。用户选命令，有些直接执行，有些需要填参数。

### 三者对应关系

| 概念 | Claude Code 里的例子 | 你的 App 里可以做的 |
|---|---|---|
| MCP Host | Claude Code 本身 | 你开发的 App |
| MCP Prompt 模板 | /review, /add-dir | /词汇深度学习, /写作润色 |
| 参数填写 | /add-dir [路径] | /词汇学习 [单词] [难度] |

### 区别只是宿主不同

Claude Code 是 Anthropic 开发的 Host，它展示的是自己内置的命令列表。

你开发的 App 作为 Host，可以连接你自己的 MCP Server，展示你在 Server 里定义的 Prompt 模板。

用户体验完全一致：输入 `/`，弹出列表，选命令，有参数就填参数，确认后展开执行。**机制完全相同，只是换了一个 Host 和一套模板内容。**

> **Speakeasy 实战：** 你可以在 Speakeasy 的 MCP Server 里定义一个 `/深度学习` 模板，参数是单词和难度级别，模板展开后自动生成：词源 + 例句 + 记忆口诀 + 相关词族——用户每次只需填一个单词，得到的是标准化的专家级学习内容。

---

## Q3: 动态 Tool 注册有哪些弊端？

动态注册解决了"Tool 太多"的问题，但引入了新的复杂度。**四个真实弊端，每一个都是工程上的实际痛点。**

**弊端 1：意图分类本身可能出错（高频）**
用户说"查一下上个月的销售报表"，意图分类触发了"客户查询"分组而不是"报表分析"，正确的 `generate_report` Tool 根本没被暴露出来——任务失败，而且用户看不到任何错误提示，AI 只是告诉他"我没有这个能力"。

意图分类错了，比静态注册（至少 AI 能找到 Tool）还要糟糕。

**弊端 2：跨场景任务无法处理（架构级）**
用户说"帮我找到客户张三，查他所有订单，再生成一份报表发给他"——这个任务横跨"客户查询"、"订单管理"、"报表分析"三个 Tool 分组。

动态注册的两个选择都不好：
- 一次性暴露全部分组 → 退化成静态注册，优势消失
- 多轮切换分组 → 需要额外的状态管理，复杂度翻倍

**弊端 3：引入额外延迟和成本（工程）**
意图分类通常本身也是一次 LLM 调用（或者至少是一次向量检索），在真正回答用户问题之前多了一个网络请求。

用户感受到的延迟增加，API 成本增加。如果意图分类本身也不稳定，等于在不稳定的基础上又加了一层不稳定。

**弊端 4：维护成本高（工程）**
Tool 分组逻辑需要随业务变化持续更新。新增一个 Tool，要决定它属于哪个分组，边界模糊时很容易被遗漏。

分组之间的边界本身也是模糊的（"创建订单"是"订单管理"还是"销售流程"？），每次有争议都需要人工决策，增加了团队沟通成本。

### 什么时候值得用动态注册

| 适合用 | 不适合用 |
|---|---|
| Tool 数量超过 20 个 | Tool 数量少于 15 个（直接静态即可） |
| 业务场景边界清晰（客服 vs 财务 vs 技术支持） | 用户任务复杂、跨业务域 |
| 用户角色固定（销售只用销售 Tool） | 对延迟敏感的场景 |
| 任务通常不跨场景 | 团队没有人维护分组逻辑 |

---

## Q4: 对 Function Calling 的理解是否正确？

你说的：**"FC 是对 AI 输出结果的结构化，AI 做了意图识别，输出对工具使用的决策，然后代码执行决策"**——这个表述准确且清晰。✓ 你的理解现在完全正确，可以直接用于面试。

### 补充一个细节让表述更完整

AI 做的不只是"要不要调"，还包括**"填什么参数"**——这也是 AI 推理的一部分，不是代码自动填的。

完整的说法：

> AI 做意图识别 + 参数推断，输出结构化的调用决策（工具名 + 参数值）；代码拦截这个决策并执行真实操作，再把结果传回 AI 继续推理。

### FC 在整个知识体系里的位置

```
Function Calling（LLM 原生能力）
  │  ← AI 输出结构化意图，代码执行
  ├── MCP Tools（对 FC 的标准化封装）
  │     ← 统一协议、服务发现、跨模型复用
  ├── ReAct 模式（使用 FC 的推理范式）
  │     ← Reasoning（思考）+ Acting（调用 Tool）循环
  └── Agent Loop（多轮 FC 调用的完整循环）
        └── Multi-Agent（多个 Agent 互相调用）
```

> **从 FC 到 MCP 的升级逻辑：** FC 解决了"AI 能调工具"的问题，但每个模型格式不同，每个应用都要自己定义工具——生态碎片化。MCP 在 FC 之上加了标准协议，让一个工具 Server 写一次，所有支持 MCP 的模型和应用都能用。就像 HTTP 解决了"计算机能通信"，REST 进一步规范了"如何通信"。

---

## Q5: Schema 是什么，在 MCP 语境里指什么？

**Schema = 数据结构的描述规范。**
它本身不是数据，是数据的"说明书"——告诉你这份数据有哪些字段、每个字段是什么类型、哪些必填、取值范围是什么。

Schema 就像一张表格的表头设计图——不是表格里的数据，而是定义了：
- 这张表有哪几列（字段名）
- 每列填数字还是文字（类型）
- 哪列不能为空（required）
- 数字的合法范围是多少（minimum / maximum）

### 在 MCP 里，JSON Schema 用来描述 Tool 的参数结构

```json
{
  "name": "get_weather",
  "description": "查询指定城市的天气预报",

  "parameters": {               // ← 这整块就是 JSON Schema
    "type": "object",
    "properties": {
      "city": {
        "type": "string",       // ← city 是字符串
        "description": "城市名，如：上海、北京"
      },
      "days": {
        "type": "integer",      // ← days 是整数
        "description": "预报天数",
        "minimum": 1,           // ← 最少1天
        "maximum": 7,           // ← 最多7天
        "default": 1
      },
      "unit": {
        "type": "string",
        "enum": ["celsius", "fahrenheit"],  // ← 只能是这两个值
        "description": "温度单位"
      }
    },
    "required": ["city"]        // ← city 必填，days 和 unit 选填
  }
}
```

### Schema 里每个关键字的含义

| 关键字 | 含义 |
|---|---|
| `"type"` | 字段的数据类型。常用：`string`（文字）、`integer`（整数）、`number`（小数）、`boolean`（是/否）、`array`（列表）、`object`（嵌套对象） |
| `"description"` | 用自然语言解释这个字段的含义和用法——这是 AI 理解参数语义的关键，写得越清楚 AI 填参越准确 |
| `"required"` | 数组形式，列出必须提供的字段名。AI 生成调用时会确保这些字段一定有值，其余字段可以省略 |
| `"enum"` | 枚举值，限定这个字段只能填固定的几个值之一。AI 不会乱填，会从列表中选择 |
| `"minimum"` / `"maximum"` | 数字字段的取值范围。AI 生成参数时会遵守这个范围，不会填超出范围的值 |
| `"default"` | 用户没有提供该字段时使用的默认值。AI 在没有明确信息时会使用默认值 |

### 为什么 Schema 对 MCP 如此重要

| 有 Schema 时 | 没有 Schema 时 |
|---|---|
| AI 知道 days 是整数，范围 1-7 → AI 填 3，合法，直接执行 | AI 可能把 days 填成 "三天"（字符串）→ 代码解析出错，Tool 调用失败 |
| AI 知道 unit 只能是 celsius / fahrenheit → AI 不会填 "摄氏度" 或 "C" | AI 可能把 unit 填成 "摄氏" 或 "°C" → API 不认识这个值，返回错误 |

> **一句话总结：** Schema 是 MCP Tool 的"参数合同"——AI 读 description 知道"要不要调这个 Tool"，读 Schema 知道"调的时候参数怎么填"。两者缺一不可，description 解决意图理解，Schema 解决参数格式。
