"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { AnalogyGridInput } from "./AnalogyGridInput";

interface Reference {
  feedback: string;
  branch: string;
  state: string;
  scheduler: string;
}

const SYSTEMS: { id: string; label: string; ref?: Reference }[] = [
  {
    id: "http_server",
    label: "HTTP server",
    ref: {
      feedback: "客户端 request 到达（socket 事件）",
      branch: "URL 路由 + 参数 + DB 查询结果 → 动态分支到不同 handler",
      state: "单次请求内：会话 / cookies / 中间件上下文（按 loop 迭代累积）",
      scheduler: "event loop 想（select 谁可读） · worker 做（执行 handler）",
    },
  },
  {
    id: "game_ai",
    label: "游戏 AI 主循环",
    ref: {
      feedback: "每帧 dt 滴答 + 玩家输入事件",
      branch: "状态机根据视野/血量/玩家位置 → 攻击/逃跑/巡逻分支",
      state: "AI memory（最近 N 帧玩家轨迹） + 世界状态快照",
      scheduler: "AI update() 想（决策下一步行为） · engine apply() 做（物理 + 渲染）",
    },
  },
  {
    id: "cooking",
    label: "厨房做菜",
    ref: {
      feedback: "尝一口 · 看锅里状态 · 闻味道（观察）",
      branch: "咸了加水 / 淡了加盐 / 糊了救火 — 分支事先不知道",
      state: "锅里的菜 + 已加配料清单（单调增长）",
      scheduler: "厨师想（下一步放什么） · 灶具做（加热）",
    },
  },
  {
    id: "kubernetes",
    label: "Kubernetes controller",
    ref: {
      feedback: "watch API 收到资源变更事件 / reconcile 定时触发",
      branch: "desired state vs actual state 的 diff → 不同动作（create/update/delete）",
      state: "集群状态缓存（informer cache） + reconcile 历史",
      scheduler: "controller 想（reconcile loop 计算 diff） · kubelet 做（真正执行）",
    },
  },
  {
    id: "custom",
    label: "其他（我自己填）",
  },
];

const GRID_CONFIG = [
  {
    num: 1 as const,
    key: "feedback" as const,
    label: "反馈",
    question: "什么事件驱动下一步？",
    hint: "例：socket 事件 / 用户点击 / 上一步的结果",
    color: "bg-orange-500",
  },
  {
    num: 2 as const,
    key: "branch" as const,
    label: "分支树",
    question: "路径是不是运行时才展开？",
    hint: "例：固定流程不是 loop · 动态分支才是",
    color: "bg-indigo-500",
  },
  {
    num: 3 as const,
    key: "state" as const,
    label: "状态累积",
    question: "什么在单调增长？",
    hint: "例：历史 / memory / 缓存",
    color: "bg-emerald-500",
  },
  {
    num: 4 as const,
    key: "scheduler" as const,
    label: "调度者",
    question: "谁在想 · 谁在做？",
    hint: "例：思考主体 vs 执行主体",
    color: "bg-rose-500",
  },
];

type GridState = Record<string, string>;

export function AnalogyBuilder() {
  const [systemId, setSystemId] = useState("http_server");
  const [grid, setGrid] = useState<GridState>({});
  const [showRef, setShowRef] = useState(false);

  const system = SYSTEMS.find((s) => s.id === systemId);
  const anyFilled = Object.values(grid).some((v) => v.trim().length > 0);
  const allFilled = GRID_CONFIG.every((g) => (grid[g.key] || "").trim().length > 0);

  const setField = (key: string, v: string) => setGrid((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="my-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
      <div className="mb-4">
        <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          选一个系统 · 把它当作 agent loop 拆解
        </label>
        <div className="flex flex-wrap gap-2">
          {SYSTEMS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSystemId(s.id);
                setShowRef(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                systemId === s.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mb-4">
        {GRID_CONFIG.map((g) => (
          <AnalogyGridInput
            key={g.key}
            num={g.num}
            label={g.label}
            question={g.question}
            hint={g.hint}
            value={grid[g.key] || ""}
            onChange={(v) => setField(g.key, v)}
            colorClass={g.color}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-zinc-500">
          {allFilled ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ 4 格都填了 · 现在可以对照参考答案
            </span>
          ) : anyFilled ? (
            <span>继续填剩下的格子（{GRID_CONFIG.filter((g) => !grid[g.key]?.trim()).length} 格未填）</span>
          ) : (
            <span>先自己填 4 格 · 不填就看参考会失去 80% 训练价值</span>
          )}
        </div>

        {system?.ref && (
          <button
            onClick={() => setShowRef((v) => !v)}
            disabled={!anyFilled}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              anyFilled
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {showRef ? "收起" : "展开"}参考答案
            {showRef ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showRef && system?.ref && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3">
                参考答案 · {system.label}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {GRID_CONFIG.map((g) => (
                  <div
                    key={g.key}
                    className="text-xs text-zinc-700 dark:text-zinc-300 p-2 rounded bg-white/60 dark:bg-zinc-950/40"
                  >
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {g.num} {g.label}：
                    </span>{" "}
                    {(system.ref as Reference)[g.key]}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 mt-3 italic">
                你的答案不一定要和这里一样——只要 4 项都能答出，就是真的理解了 loop 结构。
              </p>
            </div>
          </motion.div>
        )}
        {showRef && !system?.ref && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
              自选系统没有预置参考答案。自己对照 4 步法判断：反馈/分支/状态/调度者 4 项是否都有。
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
