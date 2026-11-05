"use client";

import { useState } from "react";
import { DEFAULT_NON_COMMERCIAL_KEYWORDS, type NonCommercialConfig } from "@/lib/meeting-kind";

// Rendez-vous non commerciaux (réponse de Jean à C1, 05/11/2026) : réglage de
// l'organisation, réservé aux managers. Un rendez-vous dont le titre contient
// un de ces mots n'est ni enregistré ni analysé ; sa carte le dit, avec un
// bouton « Analyser quand même ».
export default function NonCommercialSettings({ initial }: { initial: NonCommercialConfig }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [text, setText] = useState(initial.keywords.join(", "));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const keywords = text
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean);

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch("/api/settings/non-commercial", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, keywords }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-white">
      <div className="px-5 py-5 sm:px-6">
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Rendez-vous non commerciaux</h2>
        <p className="mb-4 text-[13px] leading-snug text-slate-500">
          Un entretien ou un point interne n&apos;a pas besoin d&apos;être enregistré ni analysé. Brief les repère aux mots du titre,
          pour toute l&apos;équipe ; chacun peut forcer l&apos;analyse d&apos;un rendez-vous depuis sa carte.
        </p>
        <label className="flex items-start gap-3 text-[14px] text-slate-800">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[color:var(--violet)]"
          />
          <span>Repérer automatiquement les rendez-vous non commerciaux</span>
        </label>
        <div className="mt-4">
          <label htmlFor="non-commercial-keywords" className="mb-1.5 block text-[13px] font-medium text-slate-700">
            Mots du titre qui les signalent
          </label>
          <textarea
            id="non-commercial-keywords"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!enabled}
            rows={3}
            className="w-full resize-y rounded-xl border border-border bg-white px-3.5 py-3 text-[14px] leading-relaxed text-slate-900 outline-none transition-colors focus:border-[color:var(--violet)] disabled:opacity-50"
          />
          <p className="mt-1.5 text-[12px] leading-snug text-slate-500">
            Séparés par des virgules. Mots entiers, sans tenir compte des majuscules ni des accents.{" "}
            <button
              type="button"
              disabled={!enabled}
              onClick={() => setText(DEFAULT_NON_COMMERCIAL_KEYWORDS.join(", "))}
              className="font-medium text-[color:var(--violet)] hover:underline disabled:opacity-50"
            >
              Revenir à la liste par défaut
            </button>
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl px-5 py-4 sm:px-6">
        {status === "error" ? (
          <p className="text-[13px] text-rose-700">Le réglage n&apos;a pas pu être enregistré. Réessayez.</p>
        ) : status === "saved" ? (
          <p className="text-[13px] font-medium text-emerald-700">Réglage enregistré.</p>
        ) : (
          <span />
        )}
        <button
          onClick={save}
          disabled={status === "saving"}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "saving" ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
