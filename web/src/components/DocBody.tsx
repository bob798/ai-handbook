import { LoopTokenGrowth } from "./visualizations/LoopTokenGrowth";
import { ToolGranularityCompare } from "./visualizations/ToolGranularityCompare";
import { MessageConveyor } from "./visualizations/MessageConveyor";
import { SubagentPipe } from "./visualizations/SubagentPipe";
import { DecisionTree } from "./visualizations/DecisionTree";
import { IntroHook } from "./visualizations/IntroHook";
import { AnalogyBuilder } from "./visualizations/AnalogyBuilder";
import { MindMapCompression } from "./visualizations/MindMapCompression";

const VIZ_REGISTRY: Record<string, React.ComponentType> = {
  LoopTokenGrowth,
  ToolGranularityCompare,
  MessageConveyor,
  SubagentPipe,
  DecisionTree,
  IntroHook,
  AnalogyBuilder,
  MindMapCompression,
};

const VIZ_PLACEHOLDER_RE =
  /<div\s+data-viz="([A-Za-z0-9_-]+)"\s*(?:\/>|>\s*<\/div>)/g;

export function DocBody({ html }: { html: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  VIZ_PLACEHOLDER_RE.lastIndex = 0;
  while ((match = VIZ_PLACEHOLDER_RE.exec(html)) !== null) {
    const [full, name] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(
        <div
          key={`html-${key++}`}
          dangerouslySetInnerHTML={{ __html: html.slice(lastIndex, start) }}
        />
      );
    }

    const Comp = VIZ_REGISTRY[name];
    if (Comp) {
      parts.push(<Comp key={`viz-${key++}`} />);
    } else {
      parts.push(
        <div
          key={`viz-missing-${key++}`}
          className="my-4 rounded border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-300"
        >
          ⚠️ 未注册的可视化组件：<code>{name}</code>
        </div>
      );
    }
    lastIndex = start + full.length;
  }

  if (lastIndex < html.length) {
    parts.push(
      <div
        key={`html-${key++}`}
        dangerouslySetInnerHTML={{ __html: html.slice(lastIndex) }}
      />
    );
  }

  return <article className="prose-doc">{parts}</article>;
}
