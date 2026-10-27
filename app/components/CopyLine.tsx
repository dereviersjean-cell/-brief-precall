"use client";

import { useState } from "react";

// Une phrase prête à dire, copiable d'un clic.
export function Line({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const quoted = /^«.*»$/.test(text.trim());
  return (
    <li className="group flex gap-2.5 text-[14px] leading-relaxed text-stone-800">
      <span className="mt-0.5 text-emerald-600">→</span>
      <span className="min-w-0 flex-1">{text}</span>
      {quoted && (
        <button
          onClick={() => {
            navigator.clipboard
              ?.writeText(text.replace(/^«\s*|\s*»$/g, ""))
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => {});
          }}
          className="shrink-0 self-start rounded-md px-2 py-0.5 text-[12px] font-medium text-stone-400 hover:bg-white hover:text-stone-700"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      )}
    </li>
  );
}
