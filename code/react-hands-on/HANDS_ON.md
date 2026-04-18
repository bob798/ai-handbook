# ReAct Hands-On（改造版）

这是 [ysymyth/ReAct](https://github.com/ysymyth/ReAct)（ICLR 2023）的可运行改造。
原仓库用的 `text-davinci-002` 已于 2024-01 下线，这里把 API 层换成 **Anthropic / OpenAI 现代 chat API**，其他文件（`wikienv.py`、`wrappers.py`、`prompts/*`）**一字未改**。

## 我们改了什么

| 文件 | 状态 |
|------|------|
| `wikienv.py` | 原样 |
| `wrappers.py` | 原样 |
| `prompts/prompts_naive.json` | 原样 |
| `data/*.json` | 原样 |
| `hotpotqa.ipynb` 等 notebook | 保留，但**跑不起来**（旧 API） |
| **`run_react.py`**（新增） | 新的入口脚本 |
| **`requirements.txt`**（新增） | 锁定 gym 0.26.2（新版不兼容） |

## 仓库包含的 4 类任务

| Notebook | 任务类型 | 数据集 | 说明 |
|---|---|---|---|
| `hotpotqa.ipynb` | **多跳问答** (Multi-hop QA) | HotpotQA dev (7405 题) | 需要跨多个维基页面推理才能回答，如"X 和 Y 是同一国籍吗？" |
| `fever.ipynb` | **事实验证** (Fact Verification) | FEVER dev | 判断一个陈述是 SUPPORTS / REFUTES / NOT ENOUGH INFO |
| `alfworld.ipynb` | **具身交互** (Embodied Agent) | ALFWorld | 在虚拟家居环境中执行任务（找物品、清洗、加热、冷却等） |
| `webshop.ipynb` | **网页购物** (Web Shopping) | WebShop | 在模拟电商网站中根据需求找到并购买商品 |

> 目前 `run_react.py` **只封装了 HotpotQA**。其他三个只有原始 notebook，且因 `text-davinci-002` 已下线而跑不起来。其中 FEVER 最容易改（结构和 HotpotQA 几乎一样，只是 wrapper 不同），AlfWorld 和 WebShop 需要额外装环境依赖。

## prompts 目录

所有文件都是 JSON 格式的 few-shot 示例集，**原仓库原样保留，未做修改**。每个 key 对应一组 few-shot prompt，value 是拼接到 LLM 输入前的纯文本。

| 文件 | 用于任务 | Key 数量 | 包含的方法 |
|---|---|---|---|
| `prompts_naive.json` | HotpotQA 多跳问答 | 8 | ReAct / Act-only / CoT / Standard QA |
| `fever.json` | FEVER 事实验证 | 4 | ReAct / Act-only / CoT / Standard |
| `alfworld.json` | ALFWorld 具身交互 | 24 | ReAct / Act-only，覆盖 6 种家居任务 |
| `alfworld_3prompts.json` | ALFWorld（更多示例） | 36 | 同上，每种任务 3-shot（而非 2-shot） |

详细的 key 说明、四种方法的对比、示例片段见 [`prompts/README.md`](prompts/README.md)。

## 发给模型的完整 Prompt 结构

每次 LLM 调用，发送的 prompt 由以下 5 部分拼接而成（`run_react.py:127-137`）：

```
┌──────────────────────────────────────────────────────┐
│ 1. INSTRUCTION（固定系统指令）                          │
│    "Solve a question answering task with              │
│     interleaving Thought, Action, Observation..."     │
│    定义三种 Action: Search / Lookup / Finish           │
├──────────────────────────────────────────────────────┤
│ 2. Few-shot 示例（webthink_simple6，6 道完整示例）       │
│    每道示例含完整 Thought/Action/Observation 循环       │
├──────────────────────────────────────────────────────┤
│ 3. 当前题目                                            │
│    "Question: Were Scott Derrickson and Ed Wood..."    │
├──────────────────────────────────────────────────────┤
│ 4. 已有的推理历史（逐轮累加）                            │
│    Thought 1→Action 1→Observation 1→Thought 2→...     │
├──────────────────────────────────────────────────────┤
│ 5. 当前轮提示前缀 + stop_sequences                     │
│    "Thought {i}:" ← 模型从此续写                       │
│    stop = ["\nObservation {i}:"] ← 截断模型输出        │
└──────────────────────────────────────────────────────┘
```

**关键机制**：

- **API 是什么**：这里的 API 是 LLM 厂商提供的 **HTTP 远程服务接口**（如 Anthropic Messages API、OpenAI Chat Completions API）。代码不在本地跑模型，而是通过网络把 prompt 发给远程服务器，服务器运行模型后返回结果。
- **stop_sequences 拦截**：模型看过 few-shot 示例中完整的 Thought → Action → Observation 循环，所以它**有能力继续生成 Observation**（即自己编造搜索结果）。但我们不要它编，而是用真实的 Wikipedia 结果。`stop_sequences=["\nObservation {i}:"]` 就是"拦截点" — 模型刚输出到 Observation 时被强制停止，只返回 Thought + Action。然后程序拿到 Action，自己去调 Wikipedia 获取真实结果作为 Observation，拼回 prompt 再发给模型做下一轮推理。
- **循环退出（两种）**：ReAct 循环最多跑 `max_steps` 轮（默认 8）。模型输出 `Finish[answer]` 则提前 `break` 退出，正常评分；跑满 8 轮仍未 Finish 则强制 `finish[]`，空答案得 0 分。

```
  run_react.py (你的电脑)                LLM API (远程服务器)
  =====================                ====================

  拼接 prompt + "Thought 1:"
              ── HTTP 请求 ──►
              stop = ["\nObservation 1:"]
                                         模型逐 token 生成...
                                         "...Action 1: Search[X]"
                                         "\nObservation 1:" ← 命中 stop!
                                         ⛔ 强制停止（模型本可继续编造，但不让它输出）
              ◄── HTTP 响应 ──
              返回 Thought + Action

  解析 Action
  → 调 Wikipedia 获取真实结果
  → 作为 Observation 拼回 prompt
  → 加上 "Thought 2:" 再发给模型
```

完整的逐轮调用示例和 prompt 原文见 [`results/idx-0.md`](results/idx-0.md)。

## 安装

```bash
cd code/react-hands-on
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

> ⚠️ `gym==0.26.2` 是 OpenAI Gym 弃用前最后稳定版；原代码用 `gym.Wrapper`。新版 `gymnasium` 不兼容 `wrappers.py`，所以固定旧版。

### 下载数据集

`data/` 目录未纳入 git（~19MB），需从原仓库下载：

```bash
mkdir -p data && cd data
# HotpotQA（必需，run_react.py 依赖）
wget http://curtis.ml.cmu.edu/datasets/hotpot/hotpot_dev_distractor_v1.json -O hotpot_dev_v1_simplified.json
# 或直接从原仓库 release 下载：
# https://github.com/ysymyth/ReAct/tree/master/data
```

## 配置 API Key

**默认 Anthropic**（推荐，你在学 AI engineering）：
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

或 OpenAI：
```bash
export OPENAI_API_KEY=sk-...
```

## 跑起来

### 1. 跑单题（看完整 trace，最推荐的第一步）

```bash
python run_react.py --idx 0
```

你会看到完整的 `Thought 1 → Action 1 → Observation 1 → ...` 交替输出，这就是 ReAct 的灵魂。

### 2. 跑 5 题感受一下

```bash
python run_react.py --n 5
```

### 3. 跑 50 题算 EM 分数

```bash
python run_react.py --n 50 --quiet
```

> 50 题大约 10-20 分钟（取决于 Wikipedia 速度）。Claude Haiku 4.5 成本约 ¥1-2。

### 4. 换 OpenAI 跑对比

```bash
python run_react.py --backend openai --model gpt-4o-mini --n 5
```

### 5. 换更强的模型

```bash
python run_react.py --model claude-sonnet-4-6 --n 5
```

## CLI 参数

| 参数 | 默认 | 说明 |
|------|------|------|
| `--backend` | `anthropic` | `anthropic` / `openai` |
| `--model` | 自动 | 默认 `claude-haiku-4-5-20251001` / `gpt-4o-mini` |
| `--n` | `5` | 要跑多少道题（随机抽样） |
| `--idx` | - | 跑指定 index 的单题，优先级高于 `--n` |
| `--seed` | `233` | 跟原 notebook 一致，保证可复现 |
| `--quiet` | off | 静默每轮 trace，只看最终分数 |

## 核心对照：这版脚本跟论文/原 notebook 的关系

`run_react.py::webthink()` 几乎是 `hotpotqa.ipynb` `webthink()` 的逐行对应。差别：
- `llm()` 从 `openai.Completion` → `anthropic.Messages` / `openai.Chat` 的抽象层
- 空 action / 解析失败的边界处理（原版会 `IndexError`）
- 加了重试（原版就有，这里挪到函数里）
- 支持 CLI 而非 notebook 单元格

**Thought/Action/Observation 的循环结构完全不变**。

## 实验建议（超越"跑通"）

读完 content/02-agent/harness/agent-loop.md 后，你手里有这套代码可以做真正的实验：

1. **Ablation**：改 `INSTRUCTION` 和 prompt，去掉 Thought，只保留 Action → Observation。复现论文 Figure 2 说的"去掉推理步骤分数掉多少"。
2. **Prompt 对比**：`prompts_naive.json` 里有 `cotqa_simple6`（纯 CoT，无 action）和 `webthink_simple6`（ReAct），切换看差异。
3. **改 loop 长度**：`webthink(max_steps=4)` 能逼模型提前交卷，观察它怎么权衡。
4. **改工具粒度**（🔧 工具粒度那节）：把 `search` 和 `lookup` 合并成一个 `wiki_query`，看 loop 长度是否变短、分数是否变化。
5. **换成原生 tool_use**：重写一版用 Anthropic `tool_use` API，不再靠 `stop_sequences` 解析文本。这是你从"复现论文"跨到"超过论文"的关键一步。

## 常见问题

**Wikipedia 搜索超时/429**：原版就有这问题（`wikienv.py` 用 `requests.get` 硬爬）。代码已有 10 次重试。跑大批量时建议 `--n 50` 而非 500。

**parse-fail 很多**：注意观察，这是 few-shot prompt 失效的信号——模型没按格式输出。现代模型（尤其 Haiku）比 davinci 更严格遵循格式，但偶发 parse 失败正常。

**结果比论文好**：正常的。现代模型比 davinci-002 强很多。论文 30.4% EM，Claude Haiku 4.5 跑 50 题通常能到 40%+。
