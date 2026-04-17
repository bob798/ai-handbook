"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSteppedVisualization } from "@/hooks/useSteppedVisualization";
import { StepControls } from "./shared/StepControls";

const APPS = [
  { id: "app1", label: "Cursor",        x: 80,  y: 70 },
  { id: "app2", label: "Claude Code",   x: 80,  y: 170 },
  { id: "app3", label: "Custom Agent",  x: 80,  y: 270 },
];

const TOOLS = [
  { id: "tool1", label: "Slack",   x: 560, y: 70 },
  { id: "tool2", label: "GitHub",  x: 560, y: 170 },
  { id: "tool3", label: "Postgres", x: 560, y: 270 },
];

const MCP = { id: "mcp", label: "MCP", sub: "标准层", x: 320, y: 170 };

const N = APPS.length;     // 3
const M = TOOLS.length;    // 3

interface Step {
  title: string;
  desc: string;
  showApps: boolean;
  showTools: boolean;
  showMcp: boolean;
  // edges to draw between apps×tools (direct) — array of "appId-toolId"
  directEdges: string[];
  // edges to draw apps→mcp and mcp→tools — boolean
  showAppsToMcp: boolean;
  showMcpToTools: boolean;
  // counter to display
  counter?: { label: string; value: string; highlight?: "warn" | "good" };
}

const ALL_DIRECT: string[] = [];
for (const a of APPS) for (const t of TOOLS) ALL_DIRECT.push(`${a.id}-${t.id}`);

const STEPS: Step[] = [
  {
    title: "起点：M 个应用想接入 N 个工具",
    desc: "每个 AI 应用都想调用一堆外部能力。如果没有协议，每对 (App, Tool) 都得单独写集成代码。",
    showApps: true,
    showTools: true,
    showMcp: false,
    directEdges: [],
    showAppsToMcp: false,
    showMcpToTools: false,
  },
  {
    title: "暴力解：M × N 次集成",
    desc: "Cursor 自己写 Slack/GitHub/Postgres 接入；Claude Code 再写一遍；Custom Agent 又写一遍。每个 App × 每个 Tool 都是一次工作量。",
    showApps: true,
    showTools: true,
    showMcp: false,
    directEdges: ALL_DIRECT,
    showAppsToMcp: false,
    showMcpToTools: false,
    counter: {
      label: "集成次数",
      value: `${N} × ${M} = ${N * M}`,
      highlight: "warn",
    },
  },
  {
    title: "MCP 切进来：插入一个标准层",
    desc: "MCP 不是一个新工具，是一个让 App 和 Tool 用同一种语言交流的协议层。",
    showApps: true,
    showTools: true,
    showMcp: true,
    directEdges: [],
    showAppsToMcp: false,
    showMcpToTools: false,
  },
  {
    title: "M + N 次集成：每边只对接一次",
    desc: "App 只需接入 MCP 协议（M 次）；Tool 只需实现 MCP Server（N 次）。新增一个 App 不用改任何 Tool；新增一个 Tool 不用改任何 App。",
    showApps: true,
    showTools: true,
    showMcp: true,
    directEdges: [],
    showAppsToMcp: true,
    showMcpToTools: true,
    counter: {
      label: "集成次数",
      value: `${N} + ${M} = ${N + M}`,
      highlight: "good",
    },
  },
  {
    title: "数字一变大，价值就指数级",
    desc: "假设有 10 个 AI 应用要接入 20 个企业系统：M×N = 200 次集成 vs M+N = 30 次集成。这就是为什么 MCP 被称为 \"AI 时代的 USB-C\"。",
    showApps: true,
    showTools: true,
    showMcp: true,
    directEdges: [],
    showAppsToMcp: true,
    showMcpToTools: true,
    counter: {
      label: "10 应用 × 20 工具",
      value: "200 → 30  (节省 85%)",
      highlight: "good",
    },
  },
];

export function MCPNPlusM() {
  const viz = useSteppedVisualization({ totalSteps: STEPS.length, autoPlayMs: 3500 });
  const step = STEPS[viz.currentStep];

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950">
      <div className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="text-xs uppercase tracking-wider text-orange-600 font-semibold mb-1">
          MCP 核心价值动画 · {viz.currentStep + 1}/{STEPS.length}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={viz.currentStep}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <h3 className="text-lg font-bold mb-1">{step.title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {step.desc}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 660 360"
          className="w-full h-auto bg-zinc-50 dark:bg-zinc-900/50"
        >
          {/* Direct edges (app → tool) */}
          <AnimatePresence>
            {step.directEdges.map((edge) => {
              const [aId, tId] = edge.split("-");
              const a = APPS.find((x) => x.id === aId)!;
              const t = TOOLS.find((x) => x.id === tId)!;
              return (
                <motion.line
                  key={`direct-${edge}`}
                  x1={a.x + 80}
                  y1={a.y + 25}
                  x2={t.x}
                  y2={t.y + 25}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              );
            })}
          </AnimatePresence>

          {/* Apps → MCP edges */}
          <AnimatePresence>
            {step.showAppsToMcp &&
              APPS.map((a) => (
                <motion.line
                  key={`a2m-${a.id}`}
                  x1={a.x + 80}
                  y1={a.y + 25}
                  x2={MCP.x}
                  y2={MCP.y + 25}
                  stroke="#10b981"
                  strokeWidth={2}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.85 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              ))}
          </AnimatePresence>

          {/* MCP → Tools edges */}
          <AnimatePresence>
            {step.showMcpToTools &&
              TOOLS.map((t) => (
                <motion.line
                  key={`m2t-${t.id}`}
                  x1={MCP.x + 80}
                  y1={MCP.y + 25}
                  x2={t.x}
                  y2={t.y + 25}
                  stroke="#10b981"
                  strokeWidth={2}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.85 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              ))}
          </AnimatePresence>

          {/* Apps */}
          {step.showApps &&
            APPS.map((a) => (
              <g key={a.id}>
                <motion.rect
                  x={a.x}
                  y={a.y}
                  width={80}
                  height={50}
                  rx={8}
                  fill="#1e3a8a"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  initial={{ opacity: 0, y: a.y - 8 }}
                  animate={{ opacity: 1, y: a.y }}
                  transition={{ duration: 0.3 }}
                />
                <text
                  x={a.x + 40}
                  y={a.y + 30}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={12}
                  fontWeight={500}
                >
                  {a.label}
                </text>
              </g>
            ))}

          {/* MCP center */}
          <AnimatePresence>
            {step.showMcp && (
              <motion.g
                key="mcp-node"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <rect
                  x={MCP.x}
                  y={MCP.y}
                  width={80}
                  height={50}
                  rx={8}
                  fill="#ea580c"
                  stroke="#fb923c"
                  strokeWidth={2}
                />
                <text
                  x={MCP.x + 40}
                  y={MCP.y + 22}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={13}
                  fontWeight={700}
                >
                  {MCP.label}
                </text>
                <text
                  x={MCP.x + 40}
                  y={MCP.y + 38}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={10}
                  opacity={0.85}
                >
                  {MCP.sub}
                </text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* Tools */}
          {step.showTools &&
            TOOLS.map((t) => (
              <g key={t.id}>
                <motion.rect
                  x={t.x}
                  y={t.y}
                  width={80}
                  height={50}
                  rx={8}
                  fill="#14532d"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  initial={{ opacity: 0, y: t.y - 8 }}
                  animate={{ opacity: 1, y: t.y }}
                  transition={{ duration: 0.3 }}
                />
                <text
                  x={t.x + 40}
                  y={t.y + 30}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={12}
                  fontWeight={500}
                >
                  {t.label}
                </text>
              </g>
            ))}

          {/* Counter */}
          <AnimatePresence mode="wait">
            {step.counter && (
              <motion.g
                key={`counter-${viz.currentStep}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <rect
                  x={220}
                  y={310}
                  width={220}
                  height={36}
                  rx={6}
                  fill={step.counter.highlight === "warn" ? "#7f1d1d" : "#14532d"}
                  stroke={step.counter.highlight === "warn" ? "#ef4444" : "#22c55e"}
                  strokeWidth={1}
                />
                <text x={232} y={332} fill="#fff" fontSize={11} opacity={0.7}>
                  {step.counter.label}
                </text>
                <text
                  x={428}
                  y={333}
                  textAnchor="end"
                  fill="#fff"
                  fontSize={14}
                  fontWeight={700}
                >
                  {step.counter.value}
                </text>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>

      <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
        <StepControls
          currentStep={viz.currentStep}
          totalSteps={viz.totalSteps}
          isPlaying={viz.isPlaying}
          isFirst={viz.isFirst}
          isLast={viz.isLast}
          onPrev={viz.prev}
          onNext={viz.next}
          onReset={viz.reset}
          onTogglePlay={viz.toggleAutoPlay}
          onJump={viz.goToStep}
        />
      </div>
    </div>
  );
}
