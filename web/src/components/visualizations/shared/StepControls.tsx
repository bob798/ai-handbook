"use client";

import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface Props {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onTogglePlay: () => void;
  onJump?: (n: number) => void;
}

export function StepControls({
  currentStep,
  totalSteps,
  isPlaying,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onReset,
  onTogglePlay,
  onJump,
}: Props) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={onTogglePlay}
        disabled={isLast && !isPlaying}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        {isPlaying ? "暂停" : isLast ? "已完成" : "自动播放"}
      </button>

      <button
        onClick={onPrev}
        disabled={isFirst}
        className="p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        aria-label="上一步"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        onClick={onNext}
        disabled={isLast}
        className="p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        aria-label="下一步"
      >
        <ChevronRight size={16} />
      </button>

      <button
        onClick={onReset}
        className="p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        aria-label="重置"
      >
        <RotateCcw size={16} />
      </button>

      <div className="flex items-center gap-1 ml-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button
            key={i}
            onClick={() => onJump?.(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === currentStep
                ? "w-6 bg-orange-600"
                : "w-1.5 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400"
            }`}
            aria-label={`跳到第 ${i + 1} 步`}
          />
        ))}
      </div>

      <span className="text-xs text-zinc-500 ml-1 tabular-nums">
        {currentStep + 1} / {totalSteps}
      </span>
    </div>
  );
}
