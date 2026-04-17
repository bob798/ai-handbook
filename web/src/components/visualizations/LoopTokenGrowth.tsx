"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const MODELS = [
  { id: "gpt35", label: "GPT-3.5 经典 · 16K", capacity: 16_000, color: "#ff6b6b" },
  { id: "gpt4", label: "GPT-4 · 32K", capacity: 32_000, color: "#ff9f43" },
  { id: "claude", label: "Claude Sonnet · 200K", capacity: 200_000, color: "#6c63ff" },
  { id: "opus1m", label: "Claude Opus · 1M", capacity: 1_000_000, color: "#00d2a0" },
];

const LOOP_INCREMENT = 2500;

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
}

function statusOf(pct: number) {
  if (pct > 95) return { cls: "text-red-500", text: "💥 溢出 / context rot" };
  if (pct > 70) return { cls: "text-orange-500", text: "⚠️ 开始迟钝" };
  if (pct > 40) return { cls: "text-amber-500", text: "逼近健康上限" };
  return { cls: "text-emerald-500", text: "健康" };
}

export function LoopTokenGrowth() {
  const [round, setRound] = useState(0);
  const [tokens, setTokens] = useState(0);

  const step = () => {
    const nextRound = round + 1;
    setRound(nextRound);
    setTokens((t) => t + LOOP_INCREMENT + Math.round(nextRound * 800));
  };
  const reset = () => {
    setRound(0);
    setTokens(0);
  };

  return (
    <div className="my-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          onClick={step}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition"
        >
          ▶ 再跑一轮 loop
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          重置
        </button>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 ml-auto">
          已跑 <b className="text-zinc-900 dark:text-zinc-100">{round}</b> 轮 · 累积{" "}
          <b className="text-zinc-900 dark:text-zinc-100">{fmt(tokens)}</b> tokens
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {MODELS.map((m) => {
          const pct = Math.min(100, (tokens / m.capacity) * 100);
          const s = statusOf(pct);
          return (
            <div
              key={m.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3"
            >
              <h5 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                {m.label}
              </h5>
              <div className="h-6 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative">
                <motion.div
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 22 }}
                  className="h-full flex items-center justify-end px-2 text-[10px] font-bold text-white"
                  style={{ background: m.color }}
                >
                  {pct >= 8 ? `${pct.toFixed(0)}%` : ""}
                </motion.div>
              </div>
              <div className="flex justify-between text-[11px] mt-1.5 text-zinc-500">
                <span>
                  {fmt(tokens)} / {fmt(m.capacity)}
                </span>
                <span className={s.cls}>{s.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
