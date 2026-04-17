"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Constraint {
  id: string;
  label: string;
  short: string;
  detail: string;
  color: string;
  angle: number; // degrees
}

const CONSTRAINTS: Constraint[] = [
  {
    id: "context",
    label: "context",
    short: "能塞多少",
    detail: "每轮 loop 都在累积 tool_result · 窗口再大也有尽头 · 压缩、off-load、prompt cache 是生存技能",
    color: "#ea580c",
    angle: -90,
  },
  {
    id: "tools",
    label: "tools",
    short: "能做什么",
    detail: "工具粒度决定 loop 长度 · 太碎要拼十几轮 · 太粗一步闯祸 · 细粒度 + 可选 bash 是 Claude Code 的答案",
    color: "#00d2a0",
    angle: 0,
  },
  {
    id: "planning",
    label: "planning",
    short: "怎么决定下一步",
    detail: "reactive 足够吗？还是要 reflective？Tree of Thoughts / Reflexion 加进来 loop 会变慢但更不容易踩同一坑",
    color: "#6c63ff",
    angle: 90,
  },
  {
    id: "safety",
    label: "safety",
    short: "做错了谁兜底",
    detail: "lethal trifecta 随时可能触发 · HITL / verifier / sanitizer / 权限白名单 —— 没有 safety 的 loop 不能上 prod",
    color: "#ff6b6b",
    angle: 180,
  },
];

const CENTER_X = 200;
const CENTER_Y = 200;
const RADIUS = 130;
const CORE_R = 46;
const NODE_R = 40;

function polar(angleDeg: number, r: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CENTER_X + r * Math.cos(a), y: CENTER_Y + r * Math.sin(a) };
}

export function MindMapCompression() {
  const [hovered, setHovered] = useState<string | null>(null);
  const active = CONSTRAINTS.find((c) => c.id === hovered);

  return (
    <div className="my-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-5">
      <div className="flex flex-col md:flex-row gap-5 items-center">
        <svg
          viewBox="0 0 400 400"
          className="w-full max-w-sm flex-shrink-0"
          role="img"
          aria-label="Loop 的 4 个约束环形图"
        >
          {CONSTRAINTS.map((c) => {
            const p = polar(c.angle, RADIUS);
            const isActive = hovered === c.id;
            return (
              <line
                key={`line-${c.id}`}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={p.x}
                y2={p.y}
                stroke={c.color}
                strokeWidth={isActive ? 3 : 1.5}
                strokeDasharray={isActive ? "0" : "4 4"}
                opacity={hovered && !isActive ? 0.25 : 0.75}
                style={{ transition: "all 0.2s" }}
              />
            );
          })}

          <motion.g
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={CORE_R + 6}
              fill="none"
              stroke="#6c63ff"
              strokeOpacity={0.3}
              strokeWidth={1.5}
              strokeDasharray="2 4"
            />
            <circle cx={CENTER_X} cy={CENTER_Y} r={CORE_R} fill="#18181b" />
            <text
              x={CENTER_X}
              y={CENTER_Y - 4}
              textAnchor="middle"
              fill="#fafafa"
              fontSize="13"
              fontWeight="700"
            >
              Loop
            </text>
            <text
              x={CENTER_X}
              y={CENTER_Y + 12}
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize="10"
            >
              20 行代码
            </text>
          </motion.g>

          {CONSTRAINTS.map((c, i) => {
            const p = polar(c.angle, RADIUS);
            const isActive = hovered === c.id;
            return (
              <motion.g
                key={c.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.08 }}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(c.id)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                style={{
                  cursor: "pointer",
                  opacity: hovered && !isActive ? 0.55 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={NODE_R}
                  fill={c.color}
                  stroke={isActive ? "#fafafa" : "transparent"}
                  strokeWidth={3}
                />
                <text
                  x={p.x}
                  y={p.y - 2}
                  textAnchor="middle"
                  fill="white"
                  fontSize="13"
                  fontWeight="700"
                  pointerEvents="none"
                >
                  {c.label}
                </text>
                <text
                  x={p.x}
                  y={p.y + 13}
                  textAnchor="middle"
                  fill="white"
                  fontSize="9"
                  opacity={0.85}
                  pointerEvents="none"
                >
                  {c.short}
                </text>
              </motion.g>
            );
          })}
        </svg>

        <div className="flex-1 min-w-0 min-h-[8rem] md:min-h-[10rem]">
          {active ? (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-lg border-l-4 bg-white dark:bg-zinc-950"
              style={{ borderLeftColor: active.color }}
            >
              <div
                className="text-xs uppercase tracking-wider font-semibold mb-1"
                style={{ color: active.color }}
              >
                {active.label}
              </div>
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                {active.short}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {active.detail}
              </p>
            </motion.div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-950/50 text-xs text-zinc-500 italic">
              鼠标悬停（或键盘 Tab focus）到 4 个约束节点上查看详情。
              <br />
              <br />
              中心是 loop 本身（20 行代码）· 围绕它的 4 个约束才是工程师真正打磨的地方——这 4 条任何一条松掉，loop 就变成玩具。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
