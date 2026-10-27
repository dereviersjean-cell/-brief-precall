"use client";

import { Line } from "@/app/components/CopyLine";
import type { DealObjectives, NextItem, ObjectiveRow } from "@/lib/call-objectives";

// Les objectifs par rendez-vous (demande de Jean du 28/10/2026) : ce que le
// dernier call devait aller chercher et ce qu'il a obtenu, puis ce qu'il faut
// aller chercher au prochain, avec la question à poser. Le message s'adresse
// au commercial, au tutoiement ; les questions, au prospect. Construit par
// lib/call-objectives.ts. Sert la page d'un call, la page d'un deal, le brief
// du call suivant et Mes deals.

const STATUS: Record<ObjectiveRow["status"], { icon: string; label: string; tone: string; dot: string }> = {
  obtenu: { icon: "✓", label: "Obtenu", tone: "text-emerald-700", dot: "bg-emerald-600 text-white" },
  deja_obtenu: { icon: "✓", label: "Déjà obtenu", tone: "text-slate-500", dot: "bg-slate-200 text-slate-600" },
  a_preciser: { icon: "~", label: "Encore flou", tone: "text-amber-700", dot: "bg-amber-100 text-amber-800" },
  pas_aborde: { icon: "", label: "Pas abordé", tone: "text-rose-700", dot: "ring-1 ring-inset ring-rose-300" },
};

function reason(item: NextItem, rank: number): string {
  if (item.reason === "a_preciser") return "À préciser";
  if (item.reason === "reporte") return "Reporté";
  return `Objectif du R${rank}`;
}

export function ObjectivesMessage({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1 text-[14.5px] leading-relaxed text-slate-800">
      {lines.map((line, i) => (
        <p key={line} className={i === lines.length - 1 ? "font-semibold text-slate-900" : ""}>
          {line}
        </p>
      ))}
    </div>
  );
}

export function ObjectivesReview({ review }: { review: ObjectiveRow[] }) {
  return (
    <ul className="space-y-3">
      {review.map((r) => (
        <li key={r.key} className="flex gap-3">
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${STATUS[r.status].dot}`}>{STATUS[r.status].icon}</span>
          <div className="min-w-0">
            <p className="text-[13.5px] text-slate-900">
              <span className="font-semibold">{r.label}</span>
              <span className={`ml-2 text-[12px] font-semibold ${STATUS[r.status].tone}`}>{STATUS[r.status].label}</span>
              {r.carried && <span className="ml-1.5 text-[11.5px] text-slate-400">· reporté</span>}
            </p>
            {r.item && <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{r.item.text}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ObjectivesPlan({ plan }: { plan: DealObjectives["plan"] }) {
  if (plan.items.length === 0) return <p className="text-[13px] text-slate-500">Les objectifs fixés sont obtenus : rien de plus à aller chercher.</p>;
  return (
    <ol className="space-y-3.5">
      {plan.items.map((i, n) => (
        <li key={i.key} className="flex gap-3">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{n + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-slate-900">
              {i.label}
              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">{reason(i, plan.rank)}</span>
            </p>
            {i.known && <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">Ce qu&apos;on a : {i.known.text}</p>}
            <ul className="mt-1">
              <Line text={i.question} />
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}

// Le bloc complet, en tête de la page d'un call.
export function ObjectivesCard({ objectives }: { objectives: DealObjectives }) {
  const got = objectives.review.filter((r) => r.status === "obtenu" || r.status === "deja_obtenu").length;
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">Le conseil de Brief</h2>
        {objectives.review.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-slate-700">
            Objectifs du R{objectives.lastRank} : {got} sur {objectives.review.length}
          </span>
        )}
      </div>
      <div className="mt-3">
        <ObjectivesMessage lines={objectives.message} />
      </div>
      <div className="mt-5 space-y-5">
        {objectives.review.length > 0 && (
          <div>
            <h3 className="mb-3 text-[12px] font-semibold text-slate-500">Ce que le R{objectives.lastRank} devait aller chercher</h3>
            <ObjectivesReview review={objectives.review} />
          </div>
        )}
        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Au R{objectives.plan.rank}, va chercher</h3>
          <ObjectivesPlan plan={objectives.plan} />
        </div>
      </div>
    </section>
  );
}
