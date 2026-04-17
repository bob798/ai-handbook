"use client";

import { motion } from "framer-motion";

interface Pair {
  title: string;
  desc: string;
  left: { label: string; sub: string; color: string };
  right: { label: string; sub: string; color: string };
  speed: number;
  unit: string;
  fast: boolean;
}

const PAIRS: Pair[] = [
  {
    title: "直接调用工具",
    desc: "工具结果全进主 loop 的 context，历史膨胀快",
    left: { label: "Main", sub: "loop", color: "#6c63ff" },
    right: { label: "Tool", sub: "bash", color: "#00d2a0" },
    speed: 1,
    unit: "× context 污染",
    fast: false,
  },
  {
    title: "子 agent 封装",
    desc: "子 loop 只返回摘要，主 context 保持干净",
    left: { label: "Main", sub: "loop", color: "#6c63ff" },
    right: { label: "Sub", sub: "agent", color: "#ff9f43" },
    speed: 10,
    unit: "× 隔离效率",
    fast: true,
  },
];

const MAX_BAR_WIDTH = 280;
const MAX_SPEED = Math.max(...PAIRS.map((p) => p.speed));

export function SubagentPipe() {
  return (
    <div className="my-6 grid gap-4 md:grid-cols-2">
      {PAIRS.map((p) => (
        <PipeCard key={p.title} pair={p} />
      ))}
    </div>
  );
}

function PipeCard({ pair }: { pair: Pair }) {
  const barWidth = Math.round((pair.speed / MAX_SPEED) * MAX_BAR_WIDTH);
  const pipeColor = pair.fast ? "#00d2a0" : "#ff6b6b";

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 flex flex-col gap-4">
      <div>
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{pair.title}</h4>
        <p className="text-xs text-zinc-500 mt-1">{pair.desc}</p>
      </div>

      <div className="flex items-center gap-2">
        <Chip {...pair.left} />
        <Pipe color={pipeColor} fast={pair.fast} />
        <Chip {...pair.right} />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 w-28 flex-shrink-0">
          {pair.speed} {pair.unit}
        </span>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: barWidth }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-2 rounded-full"
          style={{ background: pipeColor }}
        />
      </div>
    </div>
  );
}

function Chip({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2 text-white text-xs font-semibold flex flex-col items-center gap-0.5 min-w-[60px]"
      style={{ background: color }}
    >
      <span>{label}</span>
      <span className="text-[10px] font-normal opacity-80">{sub}</span>
    </div>
  );
}

function Pipe({ color, fast }: { color: string; fast: boolean }) {
  return (
    <div className="relative flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
      <motion.div
        className="absolute top-0 left-0 h-full rounded-full"
        style={{ background: color, width: "35%" }}
        animate={{ x: ["-100%", "300%"] }}
        transition={{
          duration: fast ? 1.2 : 3.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
