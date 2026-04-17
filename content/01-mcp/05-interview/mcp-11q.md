---
title: MCP深挖 · 11问
description: 面向 AI 应用工程师的 MCP 深度追问，覆盖 Prompt 用法、Gateway 写码、动态 Tool 注册、Evals、Function Calling 机制等 11 个核心问题。
---

# MCP深挖 · 11问

⑤ 含重要纠错 · AI应用工程师备战

## Q1: Prompt 模板的用法是什么？

路径：**Server定义模板 → Host展示斜杠命令 → 用户填参数 → Server展开 → 发给AI**。AI全程被动，主动权在用户。

### 完整流程（以 Claude Desktop 为例）

1. **Server声明模板：** GitHub MCP Server 声明有 `code_review` / `write_commit_msg` 等模板
2. **Host展示为 "/" 斜杠命令：** 用户在输入框输 "/" 看到可用模板列表，体验和 Slack slash command 完全一样
3. **用户选择并填参数：** 选 `code_review` → 弹出表单 → 填 `file_path="src/auth.py"`, `focus="security"`
4. **Host调Server展开模板：** Server把参数填入模板，同时自动注入 auth.py 文件内容作为 Resource，生成完整 prompt
5. **完整prompt发给AI：** AI收到带上下文的专家级指令，直接开始分析，不需要用户解释背景

| 用户直接打字 | 使用 Prompt 模板 |
|---|---|
| "帮我看下 auth.py 有没有安全问题" | 用户只填：file_path + focus |
| AI不知道要检查哪些维度 | 模板展开成专家级 prompt |
| 质量取决于用户描述能力 | 包含 SQL注入/权限/输入验证清单 |
| 每次结果质量不稳定 | 质量稳定，可复用，可分享 |

> **产品本质：** 把专家的"最佳用法"封进模板，普通用户填参数就能得到专家级结果。这是 MCP 三类能力里商业化价值最直接的一个。

---

## Q2: Gateway 必须写代码吗？

你理解正确，**Gateway必须写代码，没有魔法**。它本质是一个普通 MCP Server，Tool 的实现内部调的是其他服务。

### Gateway 核心代码结构

```javascript
const gw = new MCPServer("enterprise-gateway");

// 包装内部 REST API
gw.addTool({
  name: "get_customer",
  description: "获取客户详情，已知 customer_id 时使用...",
  handler: async ({ customer_id }) => {
    return await fetch(`http://crm/api/customers/${customer_id}`);
  }
});

// 包装内部 gRPC
gw.addTool({
  name: "get_orders",
  description: "获取客户订单列表...",
  handler: async ({ customer_id }) => {
    return await orderGrpcClient.ListOrders({ customer_id });
  }
});

// Gateway 核心价值：聚合多服务（AI看到1个Tool，背后是3个服务）
gw.addTool({
  name: "get_full_profile",
  description: "获取客户完整画像，含订单和风控评分...",
  handler: async ({ customer_id }) => {
    const [customer, orders, risk] = await Promise.all([
      crmFetch(customer_id),
      orderGrpc.list(customer_id),
      riskGrpc.score(customer_id)
    ]);
    return { customer, orders, risk_score: risk.score };
  }
});
```

| 单服务 Adapter | 完整 Gateway |
|---|---|
| 有 OpenAPI spec → 1天 | 含权限/限流/审计 → 1-2周 |
| 纯手写 → 2-3天 | 生产级稳定性 → 1个月+ |
| gRPC 有 proto → 2-3天 | 这是真实的工程成本 |

> **没有银弹：** MCP 标准化了"接口协议"，没有标准化"业务逻辑翻译"。把 gRPC protobuf 翻译成 AI 友好的 Tool description，这个业务理解的工作永远需要人来做。

---

## Q3: 什么是动态 Tool 注册？

**动态 Tool 注册** = 根据对话上下文，实时决定向 AI 暴露哪些 Tool，而不是一次性暴露全部 Tool。

| 静态注册（常见做法） | 动态注册（智能做法） |
|---|---|
| 启动时声明全部 80 个 Tool | 用户说"查客户" → 暴露2个 |
| AI 同时看到所有 Tool | 用户说"处理退款" → 切换3个 |
| 选错概率高 | 准确率高 |
| 大量 token 浪费 | token 少 |
| 无法按角色限制权限 | 天然支持权限控制 |

```javascript
const groups = {
  "客户查询": ["search_customer", "get_customer", "list_contacts"],
  "支付退款": ["get_order", "verify_refund", "issue_refund"],
  "报表分析": ["generate_report", "export_data"],
};

async function getTools(userMsg) {
  const intent = await classifyIntent(userMsg);
  return groups[intent] ?? defaultTools;
}

// 每轮对话前动态设置
mcpClient.setAvailableTools(await getTools(userInput));
```

### 3个核心价值

1. **降低 AI 选错 Tool 的概率** — 80 个 Tool 里选对 vs 5 个里选对，准确率差异极大。
2. **减少 context token 消耗** — Tool 定义本身占 token。80 个 Tool 的描述可能占 4000 tokens，5 个只需 250 tokens。
3. **实现业务级权限控制** — 销售只看客户 Tool，财务只看支付 Tool——动态注册天然支持。

---

## Q4: MCP Tool 的 Evals 方案有哪些？

有成熟方案，分**通用 Eval 框架**和**MCP 专用测试**两层。

**LangSmith（最推荐）**
LangChain 生态，最成熟的 LLM Eval 平台。有 UI，支持 Tool Call 追踪、A/B 测试不同 description、可视化对比结果。支持生产流量自动采样评测。

**PromptFoo（轻量开源）**
专做 prompt + tool 评测，配置简单，1天内可搭好。

```bash
npx promptfoo eval --config tool-evals.yaml
```

**最小可行 Eval 体系（立即可用）**

```yaml
# 黄金测试用例
- input: "帮我找一下张三的客户信息"
  expected_tool: "search_customer"
- input: "查 customer_id=123 的详情"
  expected_tool: "get_customer"
- input: "帮我把这笔订单退款"
  expected_tool: "issue_refund"

# CI 规则：通过率 < 85% → 阻断合并，重写 description
```

第一步：写20条黄金用例 → 第二步：CI自动跑 → 第三步：每次改 description 都跑一遍防退步

---

## Q5: FC 输出的 JSON 是给谁的？（含重要纠错）⚠

> **你有一个关键误解需要纠正**
> 你说"输出的结构化内容也是给AI的，让AI去调用Tool"——这个不对。
> AI 输出的 JSON 是给**你的代码（Host）**的，由代码执行真实操作，再把结果返回给 AI。

### 完整的 Function Calling 循环

```
用户："上海今天天气怎么样？"
         │
         ▼
【你的代码】把 用户消息 + Tool定义 发给 AI 模型
         │
         ▼
【AI 模型】分析后输出结构化 JSON（只是"表达意图"，不是执行）:
  {
    "type": "tool_use",
    "name": "get_weather",
    "input": { "city": "上海" }
  }
         │
         ▼  ← ✋ AI 在此停止，等待结果
【你的代码】读取 JSON，执行真实操作:
  result = weather_api.query("上海")
  → 返回: { temp: 22, weather: "晴" }
         │
         ▼
【你的代码】把结果传回给 AI（作为 tool_result）
         │
         ▼
【AI 模型】生成最终自然语言回答:
  "上海今天晴天，气温 22°C，适合出行。"
```

| 如果 AI 能直接执行 | AI 只输出意图，代码执行 |
|---|---|
| AI 可任意访问网络/文件/数据库 | 代码做权限检查/参数验证/速率限制 |
| 完全不可控 → 安全灾难 | AI 的能力在开发者掌控之内 |

> **核心认知：AI 永远不直接执行任何操作。** AI 只做：①决定调哪个 Tool、填什么参数（输出 JSON）；②拿到结果后生成自然语言。真正执行的永远是你的代码。这个边界是整个 Agent 架构安全模型的基石。

---

## Q6: Function Calling 的前世今生

FC 的演化，是**"让 AI 从聊天工具变成能做事的 Agent"**的技术史。

- **2020-2022 · 史前时代 — Prompt 硬解析**
  AI 只输出文本，开发者用正则提取信息。让 AI 回答 "CITY:上海"，再解析字符串——AI 稍微换格式就崩，极其脆弱。

- **2023年6月 · 里程碑 — OpenAI 发布 Function Calling**
  GPT-3.5/4 首次支持结构化 Tool 调用，AI 可以输出标准 JSON，不再需要解析自然语言。AI 从"聊天机器人"走向"能做事的 Agent"的真正起点。

- **2023年下半年 — 各家跟进，但格式各异**
  Claude、Gemini、各开源模型都支持 Tool Call，但 JSON 格式、字段名、调用方式各不相同——生态碎片化出现，一个 Server 无法跨模型复用。

- **2024年11月 — Anthropic 发布 MCP**
  在 FC 之上加标准协议：统一服务发现、传输层、三类能力（Tool/Resource/Prompt）。FC 是原子能力，MCP 是工程化标准。关系类比：FC:MCP = HTTP:REST。

- **2025年 · 现在 — Agent 时代，工具调用成基础设施**
  竞争从"支不支持"转向"生态有多少工具、调用多准确"。MCP 成为 AI 工具生态事实标准候选。Google 推出 A2A 作为竞争方案，标准之争仍在进行。

---

## Q7: 意图与执行之间的桥梁是什么？

**核心问题：AI（LLM）是文本处理器，只能读文本、输出文本；但现实操作需要真正执行代码。** 桥梁解决的是这个物理鸿沟。

**没有桥梁，AI 只能"表演"：**

```
用户："帮我发一封邮件给 boss@company.com"

没有桥梁的 AI 只能说：
"好的，我已经帮您起草了邮件：
 收件人：boss@company.com ..."

→ 邮件根本没有真的发出去。AI 只是"说"了发邮件。
```

**有了桥梁，意图变成现实：**

```
AI 输出意图（JSON）:
{ "tool": "send_email", "to": "boss@...", "body": "..." }
         ↓
桥梁（你的代码）拦截，执行真实操作:
gmail_api.send(to="boss@...", ...)  ← 邮件真的发出去了
         ↓
结果回传 AI → AI 确认："邮件已发送成功！"
```

> **桥梁的本质：** FC 定义了意图的格式（JSON schema），MCP 标准化了桥梁的协议（谁执行、怎么传结果）。两者合在一起，让 AI 第一次能真正"改变世界的状态"，而不只是"说说而已"。

---

## Q8: 改造 API 文档能替代 MCP 吗？

**改造 API 文档解决了"语义理解"这半步，但缺"执行桥梁"那半步——两步都需要才能形成完整闭环。**

| 改造文档能解决 | 改造文档解决不了 |
|---|---|
| AI 理解"何时调、为什么调" | AI 看懂了"要调 POST /v1/pay" |
| 减少选错 Tool 的概率 | 谁来发这个 HTTP 请求？ |
| 和写好 MCP Tool description 本质相同 | AI 不能自己执行，必须有代码桥梁 |

改造 API 文档成 AI 友好格式 ≈ 写好 MCP Tool description，本质相同：都是把接口语义用 AI 能理解的方式表达。

区别：改造文档还需要手动搭配 FC 代码才能执行；MCP Tool 是 description + 执行代码一体化，开箱即用。

改造文档不是错的，只是不完整——它是 MCP Tool 的语义子集。

---

## Q9: "对 AI 透明"是什么意思？

你的理解**基本对，但"透明"这个词有两种截然相反的用法**，在工程领域容易混淆。

**含义 A：可见、可理解**
"对 AI 透明" = AI 能看见、读懂、据此决策。这是你的理解，在 MCP 语境下正确。MCP Tool description 对 AI 透明：AI 能理解何时用、边界在哪。

**含义 B：不可见、无感知（相反！）**
"对用户透明"在工程语境常指"用户感知不到这层"。例："负载均衡对用户透明" = 用户不知道被分发到哪台服务器。和含义 A 完全相反，容易造成混淆。

> 在 MCP 语境下你的理解是对的。但这个词有歧义，建议用更精确的专业词汇替代（见 Q10）。

---

## Q10: 比"透明"更精确的词是什么？

你的直觉准确，**"透明"在这里确实不够精确**。工程领域有更合适的词，面试中用这些词会显得认知非常精准。

**Self-describing（自描述的）— 最推荐**
接口本身携带了足够的语义信息，使用者不需要查外部文档就能理解如何使用。

> "MCP Tool definitions are self-describing — the AI can infer intent, parameters, and boundaries from the description alone."

**AI-interpretable（AI 可理解的）**
强调 AI 视角。信息被组织成机器（AI）可以直接处理和推理的形式，而不仅仅是供人阅读的文字。

> "REST API docs are human-readable; MCP Tool specs are AI-interpretable."

**Semantically rich（语义丰富的）**
强调语义密度。不只告诉你"能做什么"，还有"为什么用、什么时候不用、失败了怎么办"。

**Semantically opaque（语义不透明的）— 反义词**
原文"对 AI 语义不透明"的精确英文。`POST /v1/txn/proc` 对 AI 是 semantically opaque 的——没有自带的语义线索。

> **面试建议：** 把"对 AI 语义透明"替换为 **self-describing** 或 **AI-interpretable**；把"语义不透明"替换为 **semantically opaque**。这两个词会让面试官感觉你的认知非常扎实。

---

## Q11: 为什么 AI 天然能理解 MCP Tool 定义？

**根本原因：MCP Tool 定义同时用了两种 AI 被大量训练过的语言——自然语言（description）和 JSON Schema（参数结构）。AI 理解这两种，所以 Tool 定义天然对 AI self-describing。**

### MCP Tool 定义的两个组成部分

```json
{
  // 部分 1：自然语言 description（AI 的核心强项）
  "name": "search_customer",
  "description": "当用户需要按姓名/邮件查找客户时使用。
    [何时不用] 如果已知 customer_id，用 get_customer 更精确、更快。
    [副作用] 只读，不修改任何数据。
    [失败处理] 无匹配结果时返回空数组，而非报错。",

  // 部分 2：JSON Schema（AI 训练数据中大量出现的规范格式）
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "搜索关键词，支持姓名/邮件/手机号，最少2个字符"
      },
      "limit": {
        "type": "integer",
        "default": 20,
        "maximum": 100
      }
    },
    "required": ["query"]   // AI 知道这意味着"必须提供"
  }
}
```

| 自然语言 description | JSON Schema |
|---|---|
| AI 训练时看过海量文本，自然语言理解是核心能力 | 广泛使用的规范格式，AI 训练数据里大量出现 |
| "何时用、何时不用、失败怎么办"这类说明 AI 理解起来和人一样 | required/type/properties/enum 的含义 AI 都准确掌握 |

### 对比：为什么 REST 路径 AI 理解不了

```
POST /v1/cust/src
{ "q": "张三", "pg": 1 }

AI 看到这个会想：
→ "cust" 是 customer 吗？"src" 是 search 还是 source？
→ "q" 是 query 吗？"pg" 是 page 吗？
→ 这个接口有副作用吗？会修改数据吗？
→ 什么时候应该调这个而不是另一个接口？

全部是猜测，无法确定。语义在文档里、在开发者脑子里，不在接口本身。
```

> **设计哲学：** MCP Tool 把"供人阅读的文档"变成"供 AI 推理的元数据"，嵌入接口定义本身。这让 AI 第一次能真正自主决策"要不要调用这个工具"——这就是 **self-describing interface** 的本质，也是 MCP 存在的根本原因。
