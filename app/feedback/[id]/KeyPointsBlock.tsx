"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/lib/markdown-components";

// remark-gfm isn't part of the literal component list requested, but
// generateKeyPoints' own output has been observed using a GFM pipe-table for
// "Prochaines étapes" (the prompt doesn't mandate a format there) — without
// it, react-markdown (CommonMark only) renders that as literal "| a | b |"
// text, i.e. the same "raw markdown syntax on screen" bug this whole change
// exists to fix. table/thead/tbody/tr/th/td get minimal matching styling
// (lib/markdown-components.tsx) for the same reason.

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

type Status = "idle" | "loading" | "error";

// Auto-generates on mount when there's nothing cached yet (historical
// analyses all start this way — key_points is only ever populated by this
// same POST, never by analyzeCall) — no user action required. Works
// identically in readOnly (manager) mode: the API route accepts owner or
// linked manager, and the result is cached on the call for everyone.
export default function KeyPointsBlock({
  callId,
  initialKeyPoints,
}: {
  callId: string;
  initialKeyPoints: string | null;
}) {
  const [keyPoints, setKeyPoints] = useState(initialKeyPoints);
  const [status, setStatus] = useState<Status>(initialKeyPoints ? "idle" : "loading");

  async function generate() {
    setStatus("loading");
    try {
      const res = await fetch(`/api/feedback/${callId}/key-points`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { key_points: string };
      setKeyPoints(data.key_points);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    if (keyPoints === null) generate();
    // Mount only — keyPoints starting non-null (cached) must never trigger
    // a regeneration just because the component re-rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
        <span>💡</span> Points clés
      </h2>
      <p className="text-sm text-slate-500 mt-0.5 mb-4">Ce qu&apos;un dirigeant retiendra de cette réunion</p>

      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-1">
          <Spinner />
          Génération des points clés en cours…
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-600 py-1">
          <span>Impossible de générer les points clés.</span>
          <button onClick={generate} className="text-[color:var(--violet)] hover:brightness-90 font-medium underline">
            Réessayer
          </button>
        </div>
      )}

      {status === "idle" && keyPoints && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {keyPoints}
        </ReactMarkdown>
      )}
    </div>
  );
}
