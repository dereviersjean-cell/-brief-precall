"use client";

import { useState } from "react";
import {
  DEAL_ALERT_RULES,
  DEAL_MEMORY_FIELDS,
  OBJECTION_ALERT_LABEL,
  type DealMemoryItem,
  type StoredDealMemory,
} from "@/lib/deal-memory-schema";
import type { DealMemoryObjection, DealMemoryPanel } from "@/lib/db";

// Fiche deal tirée du call — Deal Execution, étape 1, phase « à blanc » :
// seuls les managers des organisations ouvertes la voient, le temps de
// vérifier sur de vrais calls que ce qu'elle retient est juste.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const CARD = "rounded-2xl border border-border bg-white";

const RULE_LABELS = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

const QUALITY_LABELS: Record<NonNullable<DealMemoryObjection["handlingQuality"]>, { label: string; tone: string }> = {
  bien_traitee: { label: "Bien traitée", tone: "bg-emerald-50 text-emerald-700" },
  partiellement: { label: "Partiellement traitée", tone: "bg-amber-50 text-amber-700" },
  non_traitee: { label: "Non traitée", tone: "bg-rose-50 text-rose-700" },
};

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Quote({ text }: { text: string }) {
  return <p className="mt-1.5 border-l-2 border-slate-200 pl-3 text-[12.5px] italic leading-relaxed text-slate-500">« {text} »</p>;
}

function Item({ item }: { item: DealMemoryItem }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="text-[13.5px] leading-relaxed text-slate-800">
      {item.text}
      {item.verbatim && (
        <>
          {" "}
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-[12px] font-medium text-[color:var(--violet)] hover:underline"
          >
            {open ? "Masquer la phrase" : "Voir la phrase"}
          </button>
          {open && <Quote text={item.verbatim} />}
        </>
      )}
    </li>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

export default function DealMemoryBlock({ callId, panel }: { callId: string; panel: DealMemoryPanel }) {
  const [memory, setMemory] = useState<StoredDealMemory | null>(panel.initial);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/feedback/${callId}/deal-memory`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { dealMemory?: StoredDealMemory; error?: string };
      if (!res.ok || !data.dealMemory) throw new Error(data.error ?? "La génération de la fiche a échoué.");
      setMemory(data.dealMemory);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "La génération de la fiche a échoué.");
      setStatus("error");
    }
  }

  const badlyHandled = panel.objections.filter((o) => o.handlingQuality === "non_traitee" || o.handlingQuality === "partiellement");
  const alertCount = (memory?.alerts.length ?? 0) + badlyHandled.length;

  return (
    <div className="mt-8 space-y-6">
      <div className={`${CARD} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-slate-900">Fiche deal</h2>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-medium text-amber-700">
              Test · visible des managers seulement
            </span>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            {memory
              ? `Tirée de ce call le ${formatDate(memory.generatedAt)}. Chaque élément renvoie à la phrase prononcée.`
              : "Ce que Brief retient de ce call pour le deal : douleur, décideur, budget, prochaines étapes, alertes."}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={status === "loading"}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-[13px] font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
        >
          {status === "loading" && <Spinner />}
          {status === "loading" ? "Analyse du call…" : memory ? "Régénérer" : "Générer la fiche"}
        </button>
      </div>

      {status === "loading" && (
        <p className="text-[13px] text-slate-500">Brief relit tout le call : comptez jusqu&apos;à une minute.</p>
      )}
      {status === "error" && error && <p className="text-[13px] text-rose-700">{error}</p>}

      {memory && (
        <>
          <section>
            <h3 className={`${LABEL} mb-3`}>Alertes{alertCount > 0 ? ` (${alertCount})` : ""}</h3>
            {alertCount === 0 ? (
              <p className={`${CARD} p-5 text-[13.5px] text-slate-500`}>Aucune alerte sur ce call.</p>
            ) : (
              <ul className="space-y-3">
                {memory.alerts.map((alert) => (
                  <li key={alert.rule} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-800">
                      {RULE_LABELS.get(alert.rule) ?? alert.rule}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-slate-800">{alert.text}</p>
                    {alert.verbatim && <Quote text={alert.verbatim} />}
                  </li>
                ))}
                {badlyHandled.map((o, i) => (
                  <li key={`objection-${i}`} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-800">{OBJECTION_ALERT_LABEL}</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-slate-800">
                      {o.objection}
                      {o.handlingComment ? ` — ${o.handlingComment}` : ""}
                    </p>
                    {o.verbatim && <Quote text={o.verbatim} />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className={`${LABEL} mb-3`}>Mémoire du deal</h3>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {DEAL_MEMORY_FIELDS.map((field) => {
                const items = memory.fields[field.key] ?? [];
                return (
                  <div key={field.key} className={`${CARD} p-4`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-semibold text-slate-900">{field.label}</p>
                      {field.meddic && <span className="text-[11px] text-slate-400">{field.meddic}</span>}
                    </div>
                    {items.length === 0 ? (
                      <p className="mt-1.5 text-[13px] text-slate-400">Rien dans ce call.</p>
                    ) : (
                      <ul className="mt-1.5 list-disc space-y-1.5 pl-4 marker:text-slate-300">
                        {items.map((item, i) => (
                          <Item key={i} item={item} />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              <div className={`${CARD} p-4`}>
                <p className="text-[13px] font-semibold text-slate-900">Objections</p>
                {panel.objections.length === 0 ? (
                  <p className="mt-1.5 text-[13px] text-slate-400">Aucune objection relevée.</p>
                ) : (
                  <ul className="mt-1.5 space-y-2">
                    {panel.objections.map((o, i) => (
                      <li key={i} className="text-[13.5px] leading-relaxed text-slate-800">
                        {o.objection}
                        {o.handlingQuality && (
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${QUALITY_LABELS[o.handlingQuality].tone}`}>
                            {QUALITY_LABELS[o.handlingQuality].label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
