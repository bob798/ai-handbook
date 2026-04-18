# ReAct Run · idx=0 · ✅ correct

## 结果摘要

| 字段 | 值 | 说明 |
|---|---|---|
| **backend** | `volcengine` | 调用的 API 后端（火山引擎） |
| **model** | `deepseek-v3-250324` | 具体模型名称 |
| **question** | Were Scott Derrickson and Ed Wood of the same nationality? | HotpotQA 数据集 idx=0 的原始问题 |
| **gt_answer** | `yes` | Ground Truth — 数据集标注的正确答案 |
| **model_answer** | `yes` | 模型通过 `Finish[yes]` 提交的答案 |
| **EM** | 1 | Exact Match — 模型答案与标准答案完全一致则为 1，否则为 0 |
| **F1** | 1.00 | Token 级 F1 分数 — 衡量部分匹配（答案较长时更有意义） |
| **steps** | 3 | ReAct 循环执行了多少轮（Thought → Action → Observation 算一轮） |
| **LLM calls** | 3 | 实际调用 LLM 的次数（通常 = steps，除非有 parse-fail 重试） |
| **parse-fail retries** | 0 | 模型未按 `Thought N / Action N` 格式输出时的重试次数 |

---

## 发给模型的完整 Prompt 结构

每次 LLM 调用，发送的 prompt 由以下 5 部分拼接而成：

```
┌─────────────────────────────────────────────────────┐
│ 1. INSTRUCTION（系统指令，固定文本）                    │
│    "Solve a question answering task with             │
│     interleaving Thought, Action, Observation..."    │
│    定义三种 Action: Search / Lookup / Finish          │
├─────────────────────────────────────────────────────┤
│ 2. Few-shot 示例（webthink_simple6，6 道完整示例）      │
│    每道示例包含完整 Thought/Action/Observation 循环     │
├─────────────────────────────────────────────────────┤
│ 3. 当前题目                                           │
│    "Question: Were Scott Derrickson and Ed Wood      │
│     of the same nationality?"                        │
├─────────────────────────────────────────────────────┤
│ 4. 已有的推理历史（逐轮累加）                           │
│    Thought 1: ... Action 1: ... Observation 1: ...   │
│    Thought 2: ... Action 2: ... Observation 2: ...   │
├─────────────────────────────────────────────────────┤
│ 5. 当前轮的提示前缀                                    │
│    "Thought {i}:"  ← 模型从这里开始续写                │
│    stop_sequences = ["\nObservation {i}:"]            │
└─────────────────────────────────────────────────────┘
```

### 关键机制：stop_sequences 与 API 调用

这里的 **API** 是指 LLM 厂商提供的 **HTTP 远程服务接口**。你的代码并不在本地运行模型，而是通过网络把 prompt 发给远程服务器（Anthropic / OpenAI / 火山引擎等），服务器运行模型、逐 token 生成文本，然后把结果返回。

对应代码中的调用：

```python
# Anthropic Messages API
client.messages.create(model=..., messages=[...], stop_sequences=["\nObservation 1:"])

# OpenAI Chat Completions API
client.chat.completions.create(model=..., messages=[...], stop=["\nObservation 1:"])
```

`stop_sequences` 参数的作用：模型看过 few-shot 示例中完整的 Thought → Action → Observation 循环，所以它**有能力继续生成 Observation 内容**（即自己编造搜索结果）。但我们不想让它编，而是要用真实的 Wikipedia 搜索结果。`stop_sequences` 就是这个"拦截点" — 模型刚输出到 `"\nObservation 1:"` 时，服务器立即停止生成，只返回 Thought + Action 部分。

然后程序拿到 Action，自己去调 Wikipedia 获取真实结果，作为 Observation 拼回 prompt，再发给模型做下一轮推理。

以下是第 1 轮调用的完整交互图：

```
  你的电脑 (run_react.py)                    远程服务器 (Anthropic / OpenAI)
  ========================                    ================================

  1. 拼接 prompt:
     INSTRUCTION + 6-shot + 题目
     + "Thought 1:"
                        ──── HTTP 请求 ────►
                        prompt = "Solve a question..."
                        stop_sequences = ["\nObservation 1:"]

                                              2. 模型逐 token 生成：
                                                 " I need to search"
                                                 " Scott Derrickson"
                                                 " and Ed Wood..."
                                                 "\nAction 1: Search"
                                                 "[Scott Derrickson]"
                                                 "\nObservation 1:"  ← 命中 stop!
                                                 ⛔ 强制停止
                                                 （模型本可以继续编造搜索结果，
                                                   但 stop_sequences 不让它输出）

                        ◄── HTTP 响应 ────
                        返回: " I need to search Scott
                        Derrickson and Ed Wood...
                        \nAction 1: Search[Scott Derrickson]"
                        （不含 "\nObservation 1:" 本身）

  3. 解析出 Action:
     Search[Scott Derrickson]

  4. 用真实数据填 Observation（而非让模型编造）:
     程序调 Wikipedia API ──►  en.wikipedia.org
     获取搜索结果          ◄──  返回 Scott Derrickson 词条

  5. 程序拼接 Observation:
     "Observation 1: Scott Derrickson
      (born July 16, 1966) is an
      American filmmaker..."

  6. 把 Thought + Action + Observation 追加到 prompt
     再加上 "Thought 2:"，发给模型做下一轮
     （模型看到真实的搜索结果后，继续推理）
```

**为什么要这样设计？** 这就是 ReAct 的核心：把"思考"和"获取信息"分给两个角色：
- **模型负责**：推理（Thought）和决策（选择哪个 Action）
- **程序负责**：执行 Action，用**真实的外部信息**填充 Observation
- **stop_sequences 的角色**：拦截模型，不让它自己编造 Observation，保证搜索结果是真实的

### 第 1 轮调用：发给模型的完整原文

以下是第 1 轮 LLM 调用时发送的**完整 prompt 原文**（共 ~6,500 字符）：

````text
Solve a question answering task with interleaving Thought, Action, Observation steps. Thought can reason about the current situation, and Action can be three types:
(1) Search[entity], which searches the exact entity on Wikipedia and returns the first paragraph if it exists. If not, it will return some similar entities to search.
(2) Lookup[keyword], which returns the next sentence containing keyword in the current passage.
(3) Finish[answer], which returns the answer and finishes the task.
Here are some examples.

Question: What is the elevation range for the area that the eastern sector of the Colorado orogeny extends into?
Thought 1: I need to search Colorado orogeny, find the area that the eastern sector of the Colorado orogeny extends into, then find the elevation range of the area.
Action 1: Search[Colorado orogeny]
Observation 1: The Colorado orogeny was an episode of mountain building (an orogeny) in Colorado and surrounding areas.
Thought 2: It does not mention the eastern sector. So I need to look up eastern sector.
Action 2: Lookup[eastern sector]
Observation 2: (Result 1 / 1) The eastern sector extends into the High Plains and is called the Central Plains orogeny.
Thought 3: The eastern sector of Colorado orogeny extends into the High Plains. So I need to search High Plains and find its elevation range.
Action 3: Search[High Plains]
Observation 3: High Plains refers to one of two distinct land regions:
Thought 4: I need to instead search High Plains (United States).
Action 4: Search[High Plains (United States)]
Observation 4: The High Plains are a subregion of the Great Plains. From east to west, the High Plains rise in elevation from around 1,800 to 7,000 ft (550 to 2,130 m).[3]
Thought 5: High Plains rise in elevation from around 1,800 to 7,000 ft, so the answer is 1,800 to 7,000 ft.
Action 5: Finish[1,800 to 7,000 ft]
Question: Musician and satirist Allie Goertz wrote a song about the "The Simpsons" character Milhouse, who Matt Groening named after who?
Thought 1: The question simplifies to "The Simpsons" character Milhouse is named after who. I only need to search Milhouse and find who it is named after.
Action 1: Search[Milhouse]
Observation 1: Milhouse Mussolini Van Houten is a recurring character in the Fox animated television series The Simpsons voiced by Pamela Hayden and created by Matt Groening.
Thought 2: The paragraph does not tell who Milhouse is named after, maybe I can look up "named after".
Action 2: Lookup[named after]
Observation 2: (Result 1 / 1) Milhouse was named after U.S. president Richard Nixon, whose middle name was Milhous.
Thought 3: Milhouse was named after U.S. president Richard Nixon, so the answer is Richard Nixon.
Action 3: Finish[Richard Nixon]
Question: Which documentary is about Finnish rock groups, Adam Clayton Powell or The Saimaa Gesture?
Thought 1: I need to search Adam Clayton Powell and The Saimaa Gesture, and find which documentary is about Finnish rock groups.
Action 1: Search[Adam Clayton Powell]
Observation 1: Could not find [Adam Clayton Powell]. Similar: ['Adam Clayton Powell III', 'Seventh Avenue (Manhattan)', 'Adam Clayton Powell Jr. State Office Building', 'Isabel Washington Powell', 'Adam Powell', 'Adam Clayton Powell (film)', 'Giancarlo Esposito'].
Thought 2: To find the documentary, I can search Adam Clayton Powell (film).
Action 2: Search[Adam Clayton Powell (film)]
Observation 2: Adam Clayton Powell is a 1989 American documentary film directed by Richard Kilberg. The film is about the rise and fall of influential African-American politician Adam Clayton Powell Jr.[3][4] It was later aired as part of the PBS series The American Experience.
Thought 3: Adam Clayton Powell (film) is a documentary about an African-American politician, not Finnish rock groups. So the documentary about Finnish rock groups must instead be The Saimaa Gesture.
Action 3: Finish[The Saimaa Gesture]
Question: What profession does Nicholas Ray and Elia Kazan have in common?
Thought 1: I need to search Nicholas Ray and Elia Kazan, find their professions, then find the profession they have in common.
Action 1: Search[Nicholas Ray]
Observation 1: Nicholas Ray (born Raymond Nicholas Kienzle Jr., August 7, 1911 – June 16, 1979) was an American film director, screenwriter, and actor best known for the 1955 film Rebel Without a Cause.
Thought 2: Professions of Nicholas Ray are director, screenwriter, and actor. I need to search Elia Kazan next and find his professions.
Action 2: Search[Elia Kazan]
Observation 2: Elia Kazan was an American film and theatre director, producer, screenwriter and actor.
Thought 3: Professions of Elia Kazan are director, producer, screenwriter, and actor. So profession Nicholas Ray and Elia Kazan have in common is director, screenwriter, and actor.
Action 3: Finish[director, screenwriter, actor]
Question: Which magazine was started first Arthur's Magazine or First for Women?
Thought 1: I need to search Arthur's Magazine and First for Women, and find which was started first.
Action 1: Search[Arthur's Magazine]
Observation 1: Arthur's Magazine (1844-1846) was an American literary periodical published in Philadelphia in the 19th century.
Thought 2: Arthur's Magazine was started in 1844. I need to search First for Women next.
Action 2: Search[First for Women]
Observation 2: First for Women is a woman's magazine published by Bauer Media Group in the USA.[1] The magazine was started in 1989.
Thought 3: First for Women was started in 1989. 1844 (Arthur's Magazine) < 1989 (First for Women), so Arthur's Magazine was started first.
Action 3: Finish[Arthur's Magazine]
Question: Were Pavel Urysohn and Leonid Levin known for the same type of work?
Thought 1: I need to search Pavel Urysohn and Leonid Levin, find their types of work, then find if they are the same.
Action 1: Search[Pavel Urysohn]
Observation 1: Pavel Samuilovich Urysohn (February 3, 1898 – August 17, 1924) was a Soviet mathematician who is best known for his contributions in dimension theory.
Thought 2: Pavel Urysohn is a mathematician. I need to search Leonid Levin next and find its type of work.
Action 2: Search[Leonid Levin]
Observation 2: Leonid Anatolievich Levin is a Soviet-American mathematician and computer scientist.
Thought 3: Leonid Levin is a mathematician and computer scientist. So Pavel Urysohn and Leonid Levin have the same type of work.
Action 3: Finish[yes]
Question: Were Scott Derrickson and Ed Wood of the same nationality?
Thought 1:
````

> **以上就是模型看到的全部内容。** 模型从最后的 `Thought 1:` 开始续写，`stop_sequences = ["\nObservation 1:"]` 会在模型输出到 Observation 前截断。

### 逐轮 prompt 增长

| 轮次 | prompt 内容 | 总长度 | stop_sequences |
|---|---|---|---|
| 第 1 轮 | INSTRUCTION + 6-shot + 当前题目 + `Thought 1:` | ~6,500 字符 | `\nObservation 1:` |
| 第 2 轮 | 上面全部 + 第 1 轮 Thought/Action/Observation + `Thought 2:` | ~7,200 字符 | `\nObservation 2:` |
| 第 3 轮 | 上面全部 + 第 2 轮 Thought/Action/Observation + `Thought 3:` | ~7,800 字符 | `\nObservation 3:` |

---

## 逐轮全流程

### 第 1 轮 LLM 调用

**发送给模型的 prompt（末尾）**：
```text
...（6 道 few-shot 示例省略）...
Question: Were Scott Derrickson and Ed Wood of the same nationality?
Thought 1:
```

**模型返回**（在遇到 `\nObservation 1:` 时被截断）：
```text
 I need to search Scott Derrickson and Ed Wood, find their nationalities,
then determine if they are the same.
Action 1: Search[Scott Derrickson]
```

**程序解析出 Action**：`Search[Scott Derrickson]`

**程序调用 Wikipedia**（`wikienv.py` 爬取维基百科 API）：
```text
Observation 1: Scott Derrickson (born July 16, 1966) is an American filmmaker.
He is known for his work in the horror genre, directing films such as
The Exorcism of Emily Rose (2005), Sinister (2012), The Black Phone (2021)...
```

**这一轮的完整文本被追加到 prompt 尾部，供下一轮使用。**

---

### 第 2 轮 LLM 调用

**发送给模型的 prompt（末尾）**：
```text
...（few-shot 示例 + 第 1 轮历史）...
Thought 1: I need to search Scott Derrickson and Ed Wood, find their nationalities...
Action 1: Search[Scott Derrickson]
Observation 1: Scott Derrickson (born July 16, 1966) is an American filmmaker...
Thought 2:
```

**模型返回**：
```text
 Scott Derrickson is an American filmmaker. I need to search Ed Wood next
and find his nationality.
Action 2: Search[Ed Wood]
```

**程序调用 Wikipedia**：
```text
Observation 2: Edward Davis Wood Jr. (October 10, 1924 – December 10, 1978) was
an American filmmaker, actor and novelist. In the 1950s, Wood directed several
low-budget science fiction, crime and horror films that later became cult classics...
```

---

### 第 3 轮 LLM 调用

**发送给模型的 prompt（末尾）**：
```text
...（few-shot 示例 + 第 1-2 轮历史）...
Thought 2: Scott Derrickson is an American filmmaker. I need to search Ed Wood...
Action 2: Search[Ed Wood]
Observation 2: Edward Davis Wood Jr. ... was an American filmmaker, actor and novelist...
Thought 3:
```

**模型返回**：
```text
 Ed Wood is also an American filmmaker. So Scott Derrickson and Ed Wood
are of the same nationality.
Action 3: Finish[yes]
```

**程序解析出 `Finish[yes]`** → `done = True`，episode 结束。

---

### 评分

```text
Observation 3: Episode finished, reward = 1
```

程序将模型答案 `yes` 与数据集标注 `yes` 对比：
- **normalize_answer()** 统一大小写、去除标点/冠词/多余空格
- **EM (Exact Match)** = 1（完全一致）
- **F1** = 1.00（token 级精确率/召回率的调和平均）

---

## 完整 Trajectory

```text
Question: Were Scott Derrickson and Ed Wood of the same nationality?

Thought 1: I need to search Scott Derrickson and Ed Wood, find their
           nationalities, then determine if they are the same.
Action 1:  Search[Scott Derrickson]
Observation 1: Scott Derrickson (born July 16, 1966) is an American
  filmmaker. He is known for his work in the horror genre, directing
  films such as The Exorcism of Emily Rose (2005), Sinister (2012),
  The Black Phone (2021), and its sequel, Black Phone 2 (2025). He is
  also known for the superhero film Doctor Strange (2016), based on the
  Marvel Comics character.. Scott Derrickson grew up in Denver, Colorado.
  He graduated from Biola University with a BA in Humanities with an
  emphasis in philosophy and literature and a B.A.

Thought 2: Scott Derrickson is an American filmmaker. I need to search
           Ed Wood next and find his nationality.
Action 2:  Search[Ed Wood]
Observation 2: Edward Davis Wood Jr. (October 10, 1924 – December 10,
  1978) was an American filmmaker, actor and novelist.. In the 1950s,
  Wood directed several low-budget science fiction, crime and horror films
  that later became cult classics, notably Glen or Glenda (1953), Jail
  Bait (1954), Bride of the Monster (1955), Plan 9 from Outer Space
  (1957) and Night of the Ghouls (1959).[1] In the 1960s and 1970s, he
  moved towards sexploitation and pornographic films such as The Sinister
  Urge (1960), Orgy of the Dead (1965) and Necromania (1971), and wrote
  over 80 lurid pulp crime and sex novels.. Notable for their campy
  aesthetics, technical errors, unsophisticated special effects, use of
  poorly-matched stock footage, eccentric casts, idiosyncratic stories
  and non sequitur dialogue, Wood's films remained largely obscure until
  he was posthumously awarded a Golden Turkey Award for Worst Director of
  All Time in 1980, renewing public interest in his life and work.[2].
  Following the publication of Rudolph Grey's 1992 oral biography
  Nightmare of Ecstasy: The Life and Art of Edward D.

Thought 3: Ed Wood is also an American filmmaker. So Scott Derrickson
           and Ed Wood are of the same nationality.
Action 3:  Finish[yes]
Observation 3: Episode finished, reward = 1
```

---

## 流程示意图

```
                  ┌──────────┐
                  │ 数据集    │ HotpotQA dev[0]
                  │ idx = 0  │
                  └────┬─────┘
                       │ question
                       ▼
              ┌────────────────┐
              │  拼接 Prompt   │ INSTRUCTION + 6-shot + question
              └────────┬───────┘
                       │
          ┌────────────▼────────────┐
          │                         │
          │    ReAct Loop (最多 8轮) │
          │                         │
          │  ┌───────────────────┐  │
     ┌────┼─►│  LLM 续写         │  │
     │    │  │  "Thought i: ..." │  │
     │    │  │  "Action i: ..."  │  │
     │    │  └────────┬──────────┘  │
     │    │           │ 解析 Action │
     │    │           ▼             │
     │    │  ┌───────────────────┐  │
     │    │  │ Search / Lookup   │  │  ← Wikipedia API
     │    │  │ → Observation i   │  │
     │    │  └────────┬──────────┘  │
     │    │           │             │
     │    │     Finish[answer]?     │
     │    │       No / Yes          │
     │    │      │       │          │
     │    └──────┘       ▼          │
     │           ┌──────────────┐   │
     └───────────┤ 追加到 prompt│   │
                 │ 进入下一轮   │   │
                 └──────────────┘   │
                                    │
          └─────────────────────────┘
                       │ done
                       ▼
              ┌────────────────┐
              │  评分           │
              │  EM = 1        │ normalize("yes") == normalize("yes")
              │  F1 = 1.00     │
              └────────────────┘
```
