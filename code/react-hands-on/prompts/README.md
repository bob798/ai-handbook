# prompts 目录说明

本目录包含 ReAct 论文实验所用的全部 **few-shot prompt 示例**。文件均为原仓库原样保留，未做修改。

每个 JSON 文件的 key 对应一组 few-shot 示例，value 是直接拼接到 LLM 输入前面的纯文本字符串。模型看到这些示例后，会按同样的格式续写新题目的推理过程。

---

## 1. `prompts_naive.json` — HotpotQA 多跳问答

用于 `hotpotqa.ipynb` 和 `run_react.py`。数据集题目形如：

> "Were Scott Derrickson and Ed Wood of the same nationality?"

需要搜索多个维基百科页面、交叉推理后回答。

### Key 一览

| Key | 方法 | Shot 数 | 被谁使用 | 说明 |
|---|---|---|---|---|
| `webthink_simple6` | **ReAct** | 6 | `run_react.py` 默认 | Thought → Action → Observation 交替循环 |
| `webthink_simple` | ReAct | 8 | 原 notebook | 同上，更多示例 |
| `webthink_simple_3` | ReAct | 3 | — | 同上，更少示例 |
| `webact_simple6` | **Act-only** | 6 | — | 只有 Action → Observation，无 Thought |
| `cotqa_simple6` | **CoT** | 6 | — | 纯推理（Chain-of-Thought），无外部工具调用 |
| `cotqa_simple` | CoT | 8 | — | 同上 |
| `webqa_simple6` | **Standard QA** | 6 | — | 直接 Question → Answer，无推理过程 |
| `webqa_simple` | Standard QA | 8 | — | 同上 |

### 四种方法的核心差异

```
ReAct (webthink):     Question → Thought 1 → Action 1 → Observation 1 → ... → Finish[answer]
Act-only (webact):    Question → Action 1 → Observation 1 → ... → Finish[answer]
CoT (cotqa):          Question → Thought: Let's think step by step. ... → Answer: xxx
Standard (webqa):     Question → Answer: xxx
```

**ReAct** 是完整版：先推理（Thought）再决定做什么（Action），看到结果（Observation）后继续推理。
**Act-only** 去掉了 Thought，模型直接决定搜索什么 — 用于论文的 ablation 实验，验证"推理步骤到底值多少分"。
**CoT** 没有外部工具，模型纯靠内部知识推理 — 用于验证"能搜维基百科到底帮了多少"。
**Standard** 是最简基线，直接输出答案。

### 可用工具（Action 类型）

| Action | 说明 |
|---|---|
| `Search[entity]` | 搜索维基百科，返回实体的第一段；找不到则返回相似实体列表 |
| `Lookup[keyword]` | 在当前页面中查找包含 keyword 的下一句 |
| `Finish[answer]` | 提交最终答案，结束 episode |

### 示例片段（`webthink_simple6` 中第 1 题）

```text
Question: What is the elevation range for the area that the eastern sector
          of the Colorado orogeny extends into?
Thought 1: I need to search Colorado orogeny, find the area that the eastern
           sector extends into, then find the elevation range.
Action 1:  Search[Colorado orogeny]
Observation 1: The Colorado orogeny was an episode of mountain building...
Thought 2: It does not mention the eastern sector. So I need to look up eastern sector.
Action 2:  Lookup[eastern sector]
Observation 2: The eastern sector extends into the High Plains...
Thought 3: The eastern sector extends into the High Plains. So I need to search
           High Plains and find its elevation range.
Action 3:  Search[High Plains]
Observation 3: High Plains refers to one of two distinct land regions:
Thought 4: I need to instead search High Plains (United States).
Action 4:  Search[High Plains (United States)]
Observation 4: ...the High Plains rise in elevation from around 1,800 to 7,000 ft...
Thought 5: High Plains rise in elevation from around 1,800 to 7,000 ft,
           so the answer is 1,800 to 7,000 ft.
Action 5:  Finish[1,800 to 7,000 ft]
```

---

## 2. `fever.json` — FEVER 事实验证

用于 `fever.ipynb`。题目是**判断一个陈述的真假**：

> "Claim: Nikolaj Coster-Waldau worked with the Fox Broadcasting Company."
> → SUPPORTS / REFUTES / NOT ENOUGH INFO

### Key 一览

| Key | 方法 | Shot 数 | 说明 |
|---|---|---|---|
| `webthink_simple3` | **ReAct** | 3 | Thought + Search/Lookup 交替，最终 Finish[SUPPORTS/REFUTES/NOT ENOUGH INFO] |
| `webact_simple3` | **Act-only** | 3 | 无 Thought，直接搜索后判断 |
| `cotqa_simple3` | **CoT** | 3 | 纯推理判断 |
| `webqa_simple3` | **Standard** | 3 | 直接给结论 |

### 与 HotpotQA 的区别

- 输出不是自由文本答案，而是三分类：`SUPPORTS` / `REFUTES` / `NOT ENOUGH INFO`
- 指令开头是 "Determine if there is Observation that SUPPORTS or REFUTES a Claim..."
- 示例更短（3-shot），因为验证任务比问答简单

### 示例片段（`webthink_simple3` 中第 3 题）

```text
Claim: Beautiful reached number two on the Billboard Hot 100 in 2003?
Thought 1: I need to search the song Beautiful and find if it reached number two
           on the Billboard Hot 100 in 2003.
Action 1:  Search[Beautiful]
Observation 1: Could not find [Beautiful]. Similar: ['Beautiful (Christina Aguilera song)', ...]
Thought 2: From suggestions, I should search "Beautiful (Christina Aguilera song)".
Action 2:  Search[Beautiful (Christina Aguilera song)]
Observation 2: "Beautiful" is a song recorded by American singer Christina Aguilera...
Thought 3: It does not mention Billboard, so I need to look up "Billboard Hot 100".
Action 3:  Lookup[Billboard Hot 100]
Observation 3: The song peaked at number two on the Billboard Hot 100...
Thought 4: It says peaked at number two, but not if it was in 2003. I am not sure.
Action 4:  Finish[NOT ENOUGH INFO]
```

---

## 3. `alfworld.json` — ALFWorld 具身交互（2-shot）

用于 `alfworld.ipynb`。模型在**虚拟家居环境**中执行任务，通过文本指令与环境交互。

### Key 命名规则

```
{react|act}_{任务类型}_{示例编号}
```

- `react_*`：含 `> think:` 推理步骤（ReAct 方法）
- `act_*`：纯动作序列，无推理（Act-only 方法）

### 6 种任务类型

| 前缀 | 任务 | 示例指令 | 典型动作序列 |
|---|---|---|---|
| `put` | 放置物品 | "put some spraybottle on toilet" | find → take → go to → put |
| `clean` | 清洗后放置 | "put a clean lettuce in diningtable" | find → take → go to sinkbasin → clean → go to → put |
| `heat` | 加热后放置 | "heat some egg and put it in diningtable" | find → take → go to microwave → heat → go to → put |
| `cool` | 冷却后放置 | "cool some tomato and put it in microwave" | find → take → go to fridge → cool → go to → put |
| `puttwo` | 放置两个同类物品 | "put two pillowcase in cabinet" | find #1 → take → put → find #2 → take → put |
| `examine` | 借助灯光查看 | "examine alarmclock with desklamp" | find item → take → find lamp → use lamp |

### 可用动作

| 动作 | 说明 |
|---|---|
| `go to {location}` | 移动到某个位置（cabinet 1, fridge 1 等） |
| `open {container}` | 打开关闭的容器 |
| `take {item} from {location}` | 拿起物品 |
| `put {item} in/on {location}` | 放下物品 |
| `clean {item} with sinkbasin` | 在水槽清洗 |
| `heat {item} with microwave` | 用微波炉加热 |
| `cool {item} with fridge` | 用冰箱冷却 |
| `use {lamp}` | 开灯（examine 任务用） |
| `> think: ...` | 推理步骤（仅 react_* 版本） |

### react vs act 对比（以 put 任务为例）

**react 版本**（含推理）：
```text
Your task is to: put some spraybottle on toilet.
> think: First I need to find a spraybottle. A spraybottle is more likely to
         appear in cabinet (1-4), countertop (1)... I can check one by one.
OK.
> go to cabinet 1
On the cabinet 1, you see a cloth 1, a soapbar 1, a soapbottle 1.
> go to cabinet 2
The cabinet 2 is closed.
> open cabinet 2
You open the cabinet 2. In it, you see a candle 1, and a spraybottle 2.
> take spraybottle 2 from cabinet 2
You pick up the spraybottle 2 from the cabinet 2.
> think: Now I find a spraybottle (2). Next, I need to put it in/on toilet 1.
OK.
> go to toilet 1
...
> put spraybottle 2 in/on toilet 1
You put the spraybottle 2 in/on the toilet 1.
```

**act 版本**（无推理，直接行动）：
```text
Your task is to: put some spraybottle on toilet.
> go to cabinet 1
On the cabinet 1, you see a cloth 1, a soapbar 1, a soapbottle 1.
> go to cabinet 2
The cabinet 2 is closed.
> open cabinet 2
You open the cabinet 2. In it, you see a candle 1, and a spraybottle 2.
> take spraybottle 2 from cabinet 2
You pick up the spraybottle 2 from the cabinet 2.
> go to toilet 1
...
> put spraybottle 2 in/on toilet 1
You put the spraybottle 2 in/on the toilet 1.
```

核心差异：react 版本在搜索前先规划"去哪里找最可能"，在找到后确认"下一步做什么"。

---

## 4. `alfworld_3prompts.json` — ALFWorld 具身交互（3-shot）

结构与 `alfworld.json` 完全相同，唯一区别是每种任务类型有 **3 个示例**（而非 2 个）。更多 few-shot 示例通常能让模型更稳定地遵循格式。

Key 命名：`{react|act}_{任务类型}_{0|1|2}`

---

## 实验建议

利用这些不同方法的 prompt，你可以直接复现论文的核心 ablation：

1. **ReAct vs Act-only**：对比 `webthink_simple6` 和 `webact_simple6`，验证 Thought 步骤值多少分
2. **ReAct vs CoT**：对比 `webthink_simple6` 和 `cotqa_simple6`，验证外部工具值多少分
3. **Shot 数量**：对比 `webthink_simple_3`（3-shot）和 `webthink_simple6`（6-shot），看 few-shot 数量的影响
4. **跨任务对比**：HotpotQA（开放问答）vs FEVER（分类判断），同一方法在不同任务上的表现差异
