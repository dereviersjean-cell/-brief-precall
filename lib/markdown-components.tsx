import type { ComponentProps } from "react";
import type ReactMarkdown from "react-markdown";

// Extracted from app/feedback/[id]/KeyPointsBlock.tsx (originally the only
// markdown rendering in the app) so the help center (/help, module Base de
// connaissance) gets the same styling instead of a second, slowly diverging
// copy. h1/h2 are intentionally identical — AI-generated key_points never
// emit a real h1 in practice, and hand-written help articles shouldn't
// either (one visual heading level below the page title). remark-gfm (used
// wherever this is rendered, not applied here) is what makes the
// table/thead/th/td styling below actually get exercised — GFM pipe tables
// render as literal "| a | b |" text without it.
export const markdownComponents: ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: ({ children }) => <h2 className="text-base font-semibold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h2>,
  h2: ({ children }) => <h2 className="text-base font-semibold text-slate-900 mt-4 mb-2 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-900 mt-3 mb-1.5 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="text-slate-700 text-sm leading-relaxed my-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside my-2 text-slate-700 text-sm space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-2 text-slate-700 text-sm space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="my-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  hr: () => <hr className="my-6 border-slate-200" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-slate-200">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 py-1.5">{children}</th>
  ),
  td: ({ children }) => <td className="text-slate-700 px-2 py-1.5 border-t border-slate-100">{children}</td>,
};
