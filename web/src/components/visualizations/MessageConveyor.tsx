"use client";

import { useEffect, useRef } from "react";

interface Lane {
  label: string;
  speed: number;
  color: string;
  packets: number;
  symbols: string[];
  desc: string;
}

const LANES: Lane[] = [
  {
    label: "第 1 轮 · 历史短",
    speed: 1.6,
    color: "#00d2a0",
    packets: 3,
    symbols: ["U", "A", "T"],
    desc: "user → assistant → tool_result · 上下文 ~200 tokens",
  },
  {
    label: "第 10 轮 · 历史中",
    speed: 1.1,
    color: "#ff9f43",
    packets: 8,
    symbols: ["U", "A", "T", "A", "T", "A", "T", "A"],
    desc: "~5K tokens · 还在健康区间",
  },
  {
    label: "第 30 轮 · 历史长",
    speed: 0.55,
    color: "#ff6b6b",
    packets: 14,
    symbols: ["U", "A", "T", "A", "T", "A", "T", "A", "T", "A", "T", "A", "T", "A"],
    desc: "~30K tokens · context rot 逼近",
  },
];

export function MessageConveyor() {
  return (
    <div className="my-6 grid gap-4 md:grid-cols-3">
      {LANES.map((lane) => (
        <LaneBelt key={lane.label} lane={lane} />
      ))}
    </div>
  );
}

function LaneBelt({ lane }: { lane: Lane }) {
  const beltRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const belt = beltRef.current;
    if (!belt) return;

    const packets = Array.from(belt.querySelectorAll<HTMLDivElement>("[data-packet]"));
    const n = packets.length;
    const beltWidth = () => belt.offsetWidth;
    const spacing = () => (beltWidth() + 40) / n;

    packets.forEach((pkt, i) => {
      pkt.style.left = `${-30 - i * spacing()}px`;
    });

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const w = beltWidth();
      packets.forEach((pkt) => {
        let x = parseFloat(pkt.style.left || "0");
        x += lane.speed * (dt / 16);
        if (x > w + 10) x = -30;
        pkt.style.left = `${x}px`;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [lane.speed]);

  const symbolColor = (sym: string) => {
    if (sym === "U") return "#6c63ff";
    if (sym === "A") return lane.color;
    return "#4ecdc4";
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{lane.label}</h4>
      <div
        ref={beltRef}
        className="relative h-14 overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
      >
        {Array.from({ length: lane.packets }).map((_, i) => {
          const sym = lane.symbols[i % lane.symbols.length];
          return (
            <div
              key={i}
              data-packet
              className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shadow"
              style={{ background: symbolColor(sym), willChange: "left" }}
            >
              {sym}
            </div>
          );
        })}
      </div>
      <div className="text-[11px] text-zinc-500">{lane.desc}</div>
    </div>
  );
}
