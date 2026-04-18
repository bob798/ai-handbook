"use client";

import { motion } from "framer-motion";
import { ExternalLink, ArrowDown } from "lucide-react";

export function IntroHook() {
  return (
    <div className="my-8 relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-orange-50 via-zinc-50 to-indigo-50 dark:from-orange-950/30 dark:via-zinc-900 dark:to-indigo-950/30 p-8 md:p-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <div className="text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-semibold mb-3">
          shareAI s01 的深度补充 · 非入门
        </div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight"
          style={{ margin: 0, border: 0, padding: 0 }}
        >
          这<span className="text-orange-600 dark:text-orange-400">不是</span> agent loop 的入门。
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-base md:text-lg text-zinc-700 dark:text-zinc-300 mt-3"
        >
          你应该先完成{" "}
          <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
            shareAI · s01 The Agent Loop
          </span>{" "}
          的 60 行 agent loop 代码，再回来读这里。
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="mt-6 flex flex-wrap gap-3"
        >
          <a
            href="https://github.com/shareAI-lab/learn-claude-code/blob/main/docs/zh/s01-the-agent-loop.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 transition"
          >
            先去写 s01
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="#第一幕--why--为什么要这么设计"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            我已完成，继续阅读
            <ArrowDown className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </motion.div>

      <div
        className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-gradient-to-br from-orange-200/40 to-indigo-200/40 dark:from-orange-700/20 dark:to-indigo-700/20 blur-2xl pointer-events-none"
        aria-hidden
      />
    </div>
  );
}
