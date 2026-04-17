"use client";

interface Node {
  question?: string;
  answer?: string;
  detail?: string;
  label?: string; // branch label (parent edge)
  tone?: "good" | "warn" | "info" | "neutral";
  branches?: Node[];
}

const TREE: Node = {
  question: "你的任务是什么形态？",
  branches: [
    {
      label: "路径固定、步骤可枚举",
      question: "需要 LLM 在每步判断吗？",
      branches: [
        {
          label: "不需要",
          answer: "不用 LLM · 写代码",
          detail: "用 if/else 脚本最便宜",
          tone: "neutral",
        },
        {
          label: "需要",
          answer: "Workflow · 预编排",
          detail: "LLM 当零件、流程写死",
          tone: "info",
        },
      ],
    },
    {
      label: "路径不可预测、分支多",
      question: "错了会造成损失吗？",
      branches: [
        {
          label: "会 (prod/钱/数据)",
          answer: "Agent + HITL",
          detail: "循环 + 权限审批 + verifier",
          tone: "warn",
        },
        {
          label: "不会 (沙箱/本地)",
          answer: "Agent Loop",
          detail: "放心让 LLM 自主决策",
          tone: "good",
        },
      ],
    },
  ],
};

const TONE_STYLES: Record<string, string> = {
  good: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200",
  warn: "bg-orange-50 dark:bg-orange-950/40 border-orange-400 dark:border-orange-700 text-orange-900 dark:text-orange-200",
  info: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200",
  neutral:
    "bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300",
};

export function DecisionTree() {
  return (
    <div className="my-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-6 overflow-x-auto">
      <div className="min-w-[640px] flex justify-center">
        <TreeNode node={TREE} />
      </div>
    </div>
  );
}

function TreeNode({ node }: { node: Node }) {
  const isAnswer = !!node.answer;
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`px-4 py-3 rounded-lg border-2 text-sm font-semibold text-center max-w-[280px] ${
          isAnswer
            ? TONE_STYLES[node.tone || "neutral"]
            : "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
        }`}
      >
        <div>{node.question || node.answer}</div>
        {node.detail && (
          <div className="text-[11px] font-normal mt-1 opacity-70">{node.detail}</div>
        )}
      </div>

      {node.branches && node.branches.length > 0 && (
        <>
          <div className="w-px h-4 bg-zinc-400 dark:bg-zinc-600" />
          <div className="flex items-start gap-6 md:gap-10 relative">
            <div
              className="absolute top-0 left-[20%] right-[20%] h-px bg-zinc-400 dark:bg-zinc-600"
              aria-hidden
            />
            {node.branches.map((child, i) => (
              <div key={i} className="flex flex-col items-center gap-3 relative">
                <div className="w-px h-4 bg-zinc-400 dark:bg-zinc-600" />
                <div className="px-2 py-1 rounded text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 -mt-1">
                  {child.label}
                </div>
                <TreeNode node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
