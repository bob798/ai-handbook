"use client";

interface Props {
  num: 1 | 2 | 3 | 4;
  label: string;
  question: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  colorClass: string;
}

export function AnalogyGridInput({
  num,
  label,
  question,
  hint,
  value,
  onChange,
  colorClass,
}: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
      <div className="flex items-start gap-3 mb-2">
        <div
          className={`flex-shrink-0 w-7 h-7 rounded-full ${colorClass} text-white text-sm font-bold flex items-center justify-center`}
        >
          {num}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{question}</div>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        rows={2}
        className="w-full mt-2 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600 font-mono resize-none"
      />
    </div>
  );
}
