"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FINE_STEPS = [
  'list_dir(".")',
  'read_file("config.json")',
  'edit_text(old="3000", new="8080")',
  'write_file("config.json", ...)',
  "run_test()",
];

const COARSE_STEPS = ['run_bash("sed -i \'s/3000/8080/\' config.json && npm test")'];

const FINE_STEP_MS = 700;

export function ToolGranularityCompare() {
  const [playKey, setPlayKey] = useState(0);
  const [fineShown, setFineShown] = useState(FINE_STEPS.length);
  const [coarseShown, setCoarseShown] = useState(COARSE_STEPS.length);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setFineShown(0);
    setCoarseShown(0);

    FINE_STEPS.forEach((_, i) => {
      const t = setTimeout(() => setFineShown(i + 1), (i + 1) * FINE_STEP_MS);
      timersRef.current.push(t);
    });
    const tc = setTimeout(() => setCoarseShown(1), 300);
    timersRef.current.push(tc);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [playKey]);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
      <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/60 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 mb-4">
        任务：<b>&ldquo;把 config.json 里的 port 从 3000 改成 8080&rdquo;</b> — 两套工具
        API，loop 长度相差 5 倍。
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Lane
          title="🧩 细粒度工具集"
          subtitle="list_dir · read_file · edit_text · write_file · run_test"
          accent="border-orange-300 dark:border-orange-900"
          steps={FINE_STEPS}
          shown={fineShown}
          summary={
            <>
              共 <b>5</b> 轮 loop · 每轮都带全部历史回模型
            </>
          }
        />
        <Lane
          title="🔨 粗粒度工具"
          subtitle="run_bash (任意 shell 命令)"
          accent="border-emerald-300 dark:border-emerald-900"
          steps={COARSE_STEPS}
          shown={coarseShown}
          summary={
            <>
              共 <b>1</b> 轮 loop · 一条命令搞定
            </>
          }
        />
      </div>

      <button
        onClick={() => setPlayKey((k) => k + 1)}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition"
      >
        ▶ 播放对比
      </button>
    </div>
  );
}

interface LaneProps {
  title: string;
  subtitle: string;
  accent: string;
  steps: string[];
  shown: number;
  summary: React.ReactNode;
}

function Lane({ title, subtitle, accent, steps, shown, summary }: LaneProps) {
  return (
    <div
      className={`rounded-lg border-2 ${accent} bg-white dark:bg-zinc-950 p-4 flex flex-col gap-3`}
    >
      <div>
        <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h4>
        <p className="text-xs text-zinc-500 mt-1 font-mono">{subtitle}</p>
      </div>
      <div className="space-y-2 min-h-[12rem]">
        <AnimatePresence initial={false}>
          {steps.slice(0, shown).map((cmd, i) => (
            <motion.div
              key={`${cmd}-${i}`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-2 rounded bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-800 dark:text-zinc-200"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
                {i + 1}
              </span>
              <span className="break-all">{cmd}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-2">
        {summary}
      </div>
    </div>
  );
}
