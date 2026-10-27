"use client";

import { useState } from "react";
import { buildActionPlan, buildQualification, priorItems, type ActionRisk, type QualificationRow } from "@/lib/deal-actions";
import type { DealMemoryItem } from "@/lib/deal-memory-schema";
import type { DealMemoryPanel } from "@/lib/db";
import { Item, Quote } from "./DealMemoryBlock";

// L'analyse d'un call centrée sur le deal (demande de Jean du 27/10/2026) :
// en tête de la page du call, ce qu'il faut faire avant le prochain, puis où
// en est la qualification du deal après ce call. Visible du commercial et de
// ses managers. L'analyse de la conversation (points clés, objections,
// scores) reste en dessous.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const CARD = "rounded-2xl border border-border bg-white";

const STATUS: Record<QualificationRow["status"], { label: string; tone: string }> = {
  nouveau: { label: "Nouveau", tone: "bg-emerald-50 text-emerald-700" },
  precise: { label: "Précisé", tone: "bg-sky-50 text-sky-700" },
  connu: { label: "Déjà connu", tone: "bg-slate-100 text-slate-600" },
  manquant: { label: "À obtenir", tone: "bg-amber-50 text-amber-700" },
};

function Risk({ risk }: { risk: ActionRisk }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-800">{risk.label}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-slate-800">{risk.text}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-900">
        <span className="font-semibold">À faire : </span>
        {risk.action}
      </p>
      {risk.verbatim && (
        <>
          <button onClick={() => setOpen((v) => !v)} className="mt-1.5 text-[12px] font-medium text-[color:var(--violet)] hover:underline">
            {open ? "Masquer la phrase" : "Voir la phrase"}
          </button>
          {open && <Quote verbatim={risk.verbatim} quote={risk.quote} />}
        </>
      )}
    </li>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2.5 text-[13px] font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

export function DealActionPlan({ callId, panel }: { callId: string; panel: DealMemoryPanel }) {
  const fiche = panel.initial;
  if (!fiche) return null;
  const callAt = panel.deal?.calls.find((c) => c.callId === callId)?.callAt ?? null;
  const qualification = buildQualification(fiche, priorItems(panel.deal, callId), callAt);
  const plan = buildActionPlan(fiche, panel.objections, qualification);
  const empty = plan.engagements.length + plan.risks.length + plan.objections.length + plan.toObtain.length === 0;

  return (
    <section className={`${CARD} p-5 sm:p-6`}>
      <h2 className={`${LABEL} mb-4`}>À faire avant le prochain call</h2>
      {empty ? (
        <p className="text-[13.5px] text-slate-500">Rien à signaler : aucun engagement relevé, aucune alerte, la qualification est complète.</p>
      ) : (
        <div className="space-y-4">
          {plan.engagements.length > 0 && (
            <Group title="Engagements pris pendant le call">
              <ul className="list-disc space-y-1.5 pl-4 marker:text-slate-300">
                {plan.engagements.map((item: DealMemoryItem, i) => (
                  <Item key={i} item={item} />
                ))}
              </ul>
            </Group>
          )}
          {plan.risks.length > 0 && (
            <Group title={`Points de vigilance (${plan.risks.length})`}>
              <ul className="space-y-2.5">
                {plan.risks.map((risk) => (
                  <Risk key={risk.rule} risk={risk} />
                ))}
              </ul>
            </Group>
          )}
          {plan.objections.length > 0 && (
            <Group title="Objections à reprendre">
              <ul className="space-y-2">
                {plan.objections.map((o, i) => (
                  <li key={i} className="text-[13.5px] leading-relaxed text-slate-800">
                    <span className="font-medium text-slate-900">{o.objection}</span>
                    {o.comment ? <span className="text-slate-600"> — {o.comment}</span> : null}
                    {o.verbatim && <Quote verbatim={o.verbatim} />}
                  </li>
                ))}
              </ul>
            </Group>
          )}
          {plan.toObtain.length > 0 && (
            <Group title="À obtenir au prochain call">
              <div className="flex flex-wrap gap-1.5">
                {plan.toObtain.map((q) => (
                  <span key={q.key} className="rounded-full bg-amber-50 px-2.5 py-1 text-[12.5px] font-medium text-amber-800">
                    {q.label}
                  </span>
                ))}
              </div>
            </Group>
          )}
        </div>
      )}
    </section>
  );
}

export function DealQualification({ callId, panel }: { callId: string; panel: DealMemoryPanel }) {
  const fiche = panel.initial;
  if (!fiche) return null;
  const callAt = panel.deal?.calls.find((c) => c.callId === callId)?.callAt ?? null;
  const rows = buildQualification(fiche, priorItems(panel.deal, callId), callAt);
  const known = rows.filter((r) => r.status !== "manquant").length;
  const learned = rows.filter((r) => r.status === "nouveau" || r.status === "precise").length;

  return (
    <section className={`${CARD} p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={LABEL}>Qualification du deal</h2>
        <p className="text-[12.5px] text-slate-500 tabular-nums">
          {known} sur {rows.length} connus{learned > 0 ? ` · ${learned} grâce à ce call` : ""}
        </p>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[color:var(--violet)]" style={{ width: `${(known / rows.length) * 100}%` }} />
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.key}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-900">{row.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[row.status].tone}`}>{STATUS[row.status].label}</span>
            </div>
            {row.latest && (
              <ul className="mt-1 list-none">
                <Item item={row.latest} date={row.status === "connu" ? row.latestAt : null} />
              </ul>
            )}
          </li>
        ))}
      </ul>
      {rows.some((r) => r.status === "connu") && (
        <p className="mt-4 text-[12px] text-slate-400">« Déjà connu » : appris lors d&apos;un call précédent du même deal, daté.</p>
      )}
    </section>
  );
}

// Un call sans fiche : rien ne tourne forcément (calls d'avant la mise en
// route, génération en échec) — on le dit sans promettre d'attente.
export function DealFocusMissing({ canGenerate, onOpen }: { canGenerate: boolean; onOpen: () => void }) {
  return (
    <section className={`${CARD} p-5`}>
      <h2 className={`${LABEL} mb-2`}>Fiche deal</h2>
      <p className="text-[13.5px] text-slate-600">
        Pas de fiche deal pour ce call. Elle se génère toute seule après chaque nouveau call enregistré
        {canGenerate ? " ; pour ce call-ci, vous pouvez la lancer." : "."}
      </p>
      {canGenerate && (
        <button
          onClick={onOpen}
          className="mt-3 inline-flex h-9 items-center rounded-full border border-border bg-white px-4 text-[13px] font-medium text-slate-900 hover:bg-slate-50"
        >
          Générer la fiche
        </button>
      )}
    </section>
  );
}

