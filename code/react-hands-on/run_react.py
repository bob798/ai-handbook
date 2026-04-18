#!/usr/bin/env python3
"""
Modernized ReAct HotpotQA runner.

Original code: https://github.com/ysymyth/ReAct (ICLR 2023, text-davinci-002)
This script keeps the original prompts, gym env (wikienv.py), and wrappers
untouched, but swaps the dead Completion API for Anthropic/OpenAI chat APIs.

Usage:
    python run_react.py --idx 0                       # run a single question
    python run_react.py --n 5                         # run 5 random questions
    python run_react.py --backend openai --n 5        # use GPT-4o-mini
    python run_react.py --model claude-sonnet-4-6 --n 10

Env vars required:
    ANTHROPIC_API_KEY  (default backend)
    OPENAI_API_KEY     (if --backend openai)
    DEEPSEEK_API_KEY   (if --backend deepseek, official API)
    VOLCENGINE_API_KEY (if --backend volcengine)
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

PROMPT_FILE = "./prompts/prompts_naive.json"

# ── 系统指令（INSTRUCTION）──────────────────────────────────────────
# 发给模型的 prompt 的第一部分：告诉模型任务是什么、有哪些工具可用。
# 完整 prompt 拼接公式：INSTRUCTION + few-shot 示例 + 当前题目 + 历史轮次 + "Thought {i}:"
# 详见 results/idx-0.md 中的完整 prompt 原文。
INSTRUCTION = (
    "Solve a question answering task with interleaving Thought, Action, "
    "Observation steps. Thought can reason about the current situation, and "
    "Action can be three types:\n"
    "(1) Search[entity], which searches the exact entity on Wikipedia and "
    "returns the first paragraph if it exists. If not, it will return some "
    "similar entities to search.\n"
    "(2) Lookup[keyword], which returns the next sentence containing keyword "
    "in the current passage.\n"
    "(3) Finish[answer], which returns the answer and finishes the task.\n"
    "Here are some examples.\n"
)

DEFAULT_MODELS = {
    "anthropic": "claude-haiku-4-5-20251001",
    "openai": "gpt-4o-mini",
    "deepseek": "deepseek-chat",
    "volcengine": "deepseek-v3-250324",
}


def make_llm(backend: str, model: str):
    """创建 LLM 调用函数。返回 llm(prompt, stop) -> str。

    所有后端统一接口：传入完整 prompt 文本 + stop_sequences 列表，
    返回模型续写的文本（在遇到 stop 序列时截断）。
    - max_tokens=100: ReAct 每轮只需输出 Thought + Action，很短
    - temperature=0: 确保输出确定性，便于复现
    - stop_sequences: 截断在 "\\nObservation {i}:" 之前，
      让模型只输出 Thought + Action，Observation 由程序填入
    """
    if backend == "anthropic":
        import anthropic

        client = anthropic.Anthropic()

        def llm(prompt: str, stop: list[str]) -> str:
            r = client.messages.create(
                model=model,
                max_tokens=100,
                temperature=0,
                stop_sequences=stop,
                messages=[{"role": "user", "content": prompt}],
            )
            return r.content[0].text if r.content else ""

        return llm

    if backend in ("openai", "deepseek", "volcengine"):
        import os

        from openai import OpenAI

        if backend == "deepseek":
            client = OpenAI(
                api_key=os.environ.get("DEEPSEEK_API_KEY"),
                base_url="https://api.deepseek.com",
            )
        elif backend == "volcengine":
            client = OpenAI(
                api_key=os.environ.get("VOLCENGINE_API_KEY"),
                base_url="https://ark.cn-beijing.volces.com/api/v3",
            )
        else:
            client = OpenAI()

        def llm(prompt: str, stop: list[str]) -> str:
            r = client.chat.completions.create(
                model=model,
                max_tokens=100,
                temperature=0,
                stop=stop,
                messages=[{"role": "user", "content": prompt}],
            )
            return r.choices[0].message.content or ""

        return llm

    raise ValueError(f"unknown backend: {backend}")


def env_step(env, action: str):
    """Retry on Wikipedia timeouts (keeps original notebook behavior)."""
    import requests

    for _ in range(10):
        try:
            return env.step(action)
        except requests.exceptions.Timeout:
            continue
    raise RuntimeError("Wikipedia search timed out 10 times in a row")


def webthink(env, llm, prompt_prefix: str, idx: int, max_steps: int = 8, to_print: bool = True):
    """一次完整的 ReAct episode — 对应 hotpotqa.ipynb 的 webthink()。

    核心循环（最多 max_steps 轮，默认 8）：
      1. 拼接 prompt = prompt_prefix + 当前题目 + 历史轮次 + "Thought {i}:"
      2. 调用 LLM 续写 → 输出 Thought + Action（被 stop_sequences 截断）
      3. 解析 Action，调用 Wikipedia API 获取 Observation
      4. 将本轮 Thought/Action/Observation 追加到 prompt，进入下一轮

    退出条件（两种）：
      - 模型输出 Finish[answer] → done=True, break 跳出，正常评分
      - 跑满 max_steps 轮仍未 Finish → 强制 finish[]，空答案，得 0 分
    """
    # ── 初始化 ──
    question = env.reset(idx=idx)  # 从 HotpotQA 数据集取第 idx 道题
    if to_print:
        print(idx, question)

    # prompt_prefix = INSTRUCTION + 6-shot few-shot 示例（见 prompts/prompts_naive.json）
    prompt = prompt_prefix + question + "\n"
    episode_lines = [question + "\n"]  # 仅记录当前 episode 的轨迹（不含 few-shot）
    n_calls = 0      # LLM 调用总次数
    n_badcalls = 0   # 解析失败的重试次数
    done = False
    info: dict = {}
    r = 0

    # ── ReAct 循环（最多 max_steps 轮）──
    for i in range(1, max_steps + 1):
        n_calls += 1
        # 发给模型：完整 prompt + "Thought {i}:"，模型从此续写
        # stop_sequences 让模型在输出到 "\nObservation {i}:" 时截断
        thought_action = llm(prompt + f"Thought {i}:", stop=[f"\nObservation {i}:"])
        try:
            # 正常情况：模型输出 "...思考内容...\nAction {i}: Search[xxx]"
            thought, action = thought_action.strip().split(f"\nAction {i}: ")
        except ValueError:
            # 解析失败：模型没按格式输出 → 提取 thought，单独再问一次 Action
            if to_print:
                print("ohh...", thought_action)
            n_badcalls += 1
            n_calls += 1
            thought = thought_action.strip().split("\n")[0]
            action = llm(
                prompt + f"Thought {i}: {thought}\nAction {i}:", stop=["\n"]
            ).strip()

        action = action.strip()
        if not action:
            action = "finish[]"       # 空 action 视为放弃，强制结束
        lowered = action[0].lower() + action[1:]

        # 执行 Action：调用 Wikipedia API（Search/Lookup）或结束（Finish）
        obs, r, done, info = env_step(env, lowered)
        obs = obs.replace("\\n", "")
        step_str = (
            f"Thought {i}: {thought}\nAction {i}: {action}\nObservation {i}: {obs}\n"
        )
        prompt += step_str            # 本轮结果追加到 prompt，供下一轮使用
        episode_lines.append(step_str)
        if to_print:
            print(step_str)
        if done:                      # 模型输出了 Finish[answer] → 提前退出
            break

    # 跑满 max_steps 轮仍未 Finish → 强制交卷，空答案得 0 分
    if not done:
        obs, r, done, info = env_step(env, "finish[]")

    if to_print:
        print(info, "\n")
    info.update({
        "n_calls": n_calls,           # LLM 调用总次数
        "n_badcalls": n_badcalls,      # 其中解析失败的重试次数
        "traj": prompt,               # 完整 prompt（含 few-shot + 全部轮次）
        "episode_trace": "".join(episode_lines),  # 仅当前 episode 的轨迹
        "question": question,
    })
    return r, info


def build_env():
    import wikienv
    import wrappers

    env = wikienv.WikiEnv()
    env = wrappers.HotPotQAWrapper(env, split="dev")
    env = wrappers.LoggingWrapper(env)
    return env


def trace_to_markdown(info: dict, idx: int, backend: str, model: str) -> str:
    """将一次 episode 的结果渲染为可读的 markdown 文件。

    输出字段说明：
    - backend/model: 使用的 API 后端和模型名
    - question: 原始问题
    - gt_answer: Ground Truth，数据集标注的正确答案
    - model_answer: 模型通过 Finish[answer] 提交的答案
    - EM (Exact Match): 模型答案与标准答案完全一致则为 1，否则为 0
    - F1: token 级 F1 分数，衡量部分匹配（答案较长时更有意义）
    - steps: ReAct 循环执行了多少轮
    - LLM calls: 实际调用 LLM 的次数（含 parse-fail 重试）
    - parse-fail retries: 模型未按格式输出时的重试次数
    """
    em = bool(info.get("em"))
    emoji = "✅" if em else "❌"
    question = info.get("question", "") or "(unknown)"
    # HotPotQAWrapper.reset returns "Question: <text>" — strip the prefix for the header.
    if question.startswith("Question: "):
        question = question[len("Question: "):]
    lines = [
        f"# ReAct Run · idx={idx} · {emoji} {'correct' if em else 'wrong'}",
        "",
        f"- **backend**: `{backend}`",
        f"- **model**: `{model}`",
        f"- **question**: {question}",
        f"- **gt_answer**: `{info.get('gt_answer', '')}`",
        f"- **model_answer**: `{info.get('answer', '')}`",
        f"- **EM / F1**: {int(em)} / {info.get('f1', 0):.2f}",
        f"- **steps**: {info.get('steps', 0)}",
        f"- **LLM calls**: {info.get('n_calls', 0)} (parse-fail retries: {info.get('n_badcalls', 0)})",
        "",
        "## Trajectory",
        "",
        "```text",
        info.get("episode_trace", "").rstrip(),
        "```",
        "",
    ]
    return "\n".join(lines)


def save_result_md(info: dict, idx: int, backend: str, model: str, results_dir: str = "results") -> str:
    import os

    os.makedirs(results_dir, exist_ok=True)
    path = os.path.join(results_dir, f"idx-{idx}.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(trace_to_markdown(info, idx, backend, model))
    return path


def main():
    """入口函数。执行流程：
    1. 解析 CLI 参数（backend, model, idx/n, seed 等）
    2. make_llm() → 创建 LLM 调用函数
    3. 加载 few-shot prompt（INSTRUCTION + webthink_simple6 的 6 道示例）
    4. build_env() → 加载 HotpotQA 数据集 + Wikipedia 搜索环境
    5. 跑单题（--idx）或批量跑（--n）→ 调用 webthink() 进入 ReAct 循环
    """
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--backend", choices=["anthropic", "openai", "deepseek", "volcengine"], default="anthropic")
    ap.add_argument("--model", default=None, help="override default model for the backend")
    ap.add_argument("--n", type=int, default=5, help="how many questions to run (ignored if --idx set)")
    ap.add_argument("--idx", type=int, default=None, help="run a single question by dataset index")
    ap.add_argument("--seed", type=int, default=233, help="shuffle seed (matches original notebook)")
    ap.add_argument("--quiet", action="store_true", help="suppress per-step trace prints")
    ap.add_argument("--save-md", action="store_true", help="save each episode's trace to results/idx-{N}.md")
    args = ap.parse_args()

    model = args.model or DEFAULT_MODELS[args.backend]
    print(f"[info] backend={args.backend} model={model}", file=sys.stderr)

    llm = make_llm(args.backend, model)

    # 拼接 prompt 前缀：INSTRUCTION（系统指令）+ 6-shot few-shot 示例
    # 后续 webthink() 会在此基础上追加当前题目和每轮的推理历史
    with open(PROMPT_FILE) as f:
        prompt_dict = json.load(f)
    prompt_prefix = INSTRUCTION + prompt_dict["webthink_simple6"]

    env = build_env()

    # ── 单题模式（--idx）──
    if args.idx is not None:
        r, info = webthink(env, llm, prompt_prefix, args.idx, to_print=not args.quiet)
        print("\n=== RESULT ===")
        summary = {k: v for k, v in info.items() if k != "traj"}
        print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))
        if args.save_md:
            path = save_result_md(info, args.idx, args.backend, model)
            print(f"[saved] {path}", file=sys.stderr)
        return

    # ── 批量模式（--n）── 从 7405 道题中随机抽 n 道
    idxs = list(range(7405))
    random.Random(args.seed).shuffle(idxs)

    rs: list[int] = []
    t0 = time.time()
    for i in idxs[: args.n]:
        _r, info = webthink(env, llm, prompt_prefix, i, to_print=not args.quiet)
        rs.append(int(info.get("em", 0)))
        if args.save_md:
            save_result_md(info, i, args.backend, model)
        avg_s = (time.time() - t0) / len(rs)
        print(
            f"[progress] EM {sum(rs)}/{len(rs)} = {sum(rs)/len(rs):.3f}  "
            f"avg {avg_s:.1f}s/q"
        )
        print("-" * 40)

    print(f"\nFINAL EM over {len(rs)} questions: {sum(rs)/max(len(rs),1):.3f}")


if __name__ == "__main__":
    main()
