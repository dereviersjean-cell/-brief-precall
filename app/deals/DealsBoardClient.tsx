"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { alertLabel, formatDays, type BoardDeal, type StageColumn, type TeamRow } from "@/lib/deal-board";
import type { DealProgress, FocusStatus } from "@/lib/deal-progress";
import { DealList, FOCUS } from "@/app/mes-deals/deal-ui";
import DealRulesForm from "./DealRulesForm";
import type { AlertImpact } from "@/lib/deal-impact";

// L'effet des alertes sur 90 jours (lib/deal-impact.ts) : après un « Vu »,
// le deal a-t-il eu un nouveau call dans le délai d'inactivité ? C'est la
// mesure « deals remis en mouvement » du pilote (question 15).
function ImpactStrip({ impact, windowDays }: { impact: AlertImpact; windowDays: number }) {
  if (impact.seen === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-white px-4 py-3 text-[13px] text-slate-500">
        Effet des alertes : rien à mesurer encore. Chaque « Vu » sur un deal signalé sera suivi — le deal a-t-il un nouveau call dans les {windowDays} jours ?
      </p>
    );
  }
  return (
    <section className="rounded-2xl border border-border bg-white px-5 py-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Effet des alertes · 90 derniers jours</h2>
      <p className="mt-2 text-[13.5px] text-slate-800">
        <span className="font-semibold tabular-nums">{impact.seen}</span> deal{impact.seen > 1 ? "s" : ""} vu{impact.seen > 1 ? "s" : ""} ·{" "}
        <span className="font-semibold tabular-nums text-emerald-700">{impact.moved}</span> remis en mouvement (nouveau call dans les {windowDays} jours)
        {impact.rate !== null && <span className="text-slate-500"> · {Math.round(impact.rate * 100)} %</span>}
        {impact.avgDays !== null && <span className="text-slate-500"> · {String(impact.avgDays).replace(".", ",")} j en moyenne</span>}
        {impact.pending > 0 && <span className="text-slate-500"> · {impact.pending} trop récent{impact.pending > 1 ? "s" : ""} pour conclure</span>}
      </p>
      {impact.byRule.length > 0 && (
        <p className="mt-1.5 text-[12.5px] text-slate-500">
          {impact.byRule
            .slice(0, 4)
            .map((r) => `${r.label} : ${r.moved}/${r.seen}`)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}

// Vue manager (Deal Execution, étape 4) : A = la file des deals où
// intervenir, C = le bandeau des étapes au-dessus (un clic filtre la file),
// B = l'onglet Équipe. Décisions du 26/10/2026, voir lib/deal-board.ts.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";
const CARD = "rounded-2xl border border-border bg-white";

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function DealCard({ deal, owner, quiet = false }: { deal: BoardDeal; owner: string; quiet?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"seen" | "later" | null>(null);
  const [proofs, setProofs] = useState(false);
  const [error, setError] = useState(false);

  async function review(status: "seen" | "later") {
    setBusy(status);
    setError(false);
    const res = await fetch(`/api/deals/${deal.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        alertRules: deal.alerts.map((a) => a.rule),
      }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) setError(true);
    else router.refresh();
  }

  const hubspot = deal.hubspot;
  return (
    <article className={`${CARD} p-5 ${quiet ? "opacity-80" : ""}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-[15px] font-semibold text-slate-900">
          <Link href={`/deal/${deal.id}`} className="hover:underline">
            {deal.name}
          </Link>
        </h3>
        <p className="text-[12.5px] text-slate-500">
          {owner}
          {hubspot?.stage ? ` · ${hubspot.stage}` : ""}
          {hubspot?.amount != null ? ` · ${formatAmount(hubspot.amount)}` : ""}
        </p>
      </div>
      <p className="mt-1 text-[12.5px] text-slate-500">
        {deal.callCount} call{deal.callCount > 1 ? "s" : ""} · dernier :{" "}
        <Link href={`/feedback/${deal.lastCall.id}`} className="font-medium text-[color:var(--violet)] hover:underline">
          {deal.lastCall.title ?? "voir la fiche"}
        </Link>
        {deal.lastCall.at ? ` le ${formatDay(deal.lastCall.at)}` : ""}
      </p>

      {/* Les alertes d'un coup d'œil ; leur détail et les phrases qui les
          prouvent sur demande — développées, dix cartes faisaient six écrans. */}
      {deal.alerts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {deal.alerts.map((a) => (
            <span key={a.rule} className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-800">
              {alertLabel(a.rule)}
            </span>
          ))}
        </div>
      )}

      {proofs && deal.alerts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {deal.alerts.map((a) => (
            <li key={a.rule} className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-amber-800">{alertLabel(a.rule)}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-slate-800">{a.text}</p>
              {a.verbatim && (
                <p className="mt-1 text-[12.5px] italic leading-relaxed text-slate-500">
                  {a.speaker ? <span className="font-medium not-italic text-slate-600">{a.speaker} : </span> : null}« {a.verbatim} »
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {deal.intervention && (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">Intervention proposée</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-slate-800">{deal.intervention}</p>
        </div>
      )}

      {deal.alerts.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!quiet && (
            <>
              <button
                onClick={() => review("seen")}
                disabled={busy !== null}
                className="inline-flex h-9 items-center rounded-full border border-border bg-white px-4 text-[13px] font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              >
                {busy === "seen" ? "…" : "Vu"}
              </button>
              <button
                onClick={() => review("later")}
                disabled={busy !== null}
                className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-slate-500 hover:text-slate-900 disabled:opacity-60"
              >
                {busy === "later" ? "…" : "Plus tard"}
              </button>
            </>
          )}
          {error && <span className="text-[12.5px] text-rose-700">Impossible d&apos;enregistrer, réessayez.</span>}
          <button
            onClick={() => setProofs((v) => !v)}
            className="ml-auto text-[12.5px] font-medium text-[color:var(--violet)] hover:underline"
          >
            {proofs ? "Masquer les preuves" : "Voir les preuves"}
          </button>
        </div>
      )}
    </article>
  );
}

function Folded({ title, deals, people }: { title: string; deals: BoardDeal[]; people: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  if (deals.length === 0) return null;
  return (
    <section>
      <button onClick={() => setOpen((v) => !v)} className={`${LABEL} hover:text-slate-900`}>
        {title} ({deals.length}) {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} owner={people[d.ownerId] ?? ""} quiet />
          ))}
        </div>
      )}
    </section>
  );
}

function StageBanner({
  stages,
  active,
  onSelect,
}: {
  stages: StageColumn[];
  active: string | null;
  onSelect: (key: string | null) => void;
}) {
  if (stages.length === 0) return null;
  const measured = stages.some((s) => s.medianDays !== null || s.passRate !== null);
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {stages.map((s, i) => {
          const selected = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onSelect(selected ? null : s.key)}
              className={`min-w-[150px] shrink-0 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                selected ? "border-[color:var(--violet)] bg-white" : "border-border bg-white/70 hover:bg-white"
              }`}
            >
              <p className="text-[11.5px] text-slate-500">{s.index ? `Étape ${s.index}` : i === stages.length - 1 ? "Hors pipeline" : ""}</p>
              <p className="text-[13px] font-semibold text-slate-900">{s.label}</p>
              <p className="mt-1 text-[12.5px] text-slate-600">
                {s.count} deal{s.count > 1 ? "s" : ""}
                {s.atRisk > 0 ? <span className="text-amber-700"> · {s.atRisk} à risque</span> : null}
              </p>
              {s.medianDays !== null || s.passRate !== null ? (
                <p className="mt-1.5 border-t border-border pt-1.5 text-[11.5px] leading-snug text-slate-500">
                  {s.medianDays !== null ? <span className="block">{formatDays(s.medianDays)} d&apos;habitude</span> : null}
                  {s.passRate !== null ? <span className="block">{Math.round(s.passRate * 100)} % passent à la suite</span> : null}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
      {measured ? (
        <p className="mt-1.5 text-[11.5px] text-slate-500">
          Durées (médianes) et taux de passage mesurés chaque matin sur l&apos;historique des deals HubSpot créés depuis un an.
        </p>
      ) : null}
    </div>
  );
}

const FOCUS_ORDER: FocusStatus[] = ["relancer", "traiter", "bonne_voie"];

// Onglet Équipe, ouvert par défaut (structure cible de Jean, 27/10/2026 :
// d'abord ce que font ses commerciaux) : une carte par personne — son
// activité, ses deals par tendance et en retard, son point à travailler — et
// son pipe, un deal par ligne vers la page du deal (bilan du manager).
function TeamMember({
  row,
  name,
  activity,
  deals,
}: {
  row: TeamRow;
  name: string;
  activity: { week: number; lastAt: string | null } | undefined;
  deals: DealProgress[];
}) {
  const [open, setOpen] = useState(true);
  const counts = { relancer: 0, traiter: 0, bonne_voie: 0 } as Record<FocusStatus, number>;
  for (const d of deals) counts[d.focus.status]++;
  return (
    <section className={`${CARD} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900">{name}</h3>
          <p className="mt-0.5 text-[12.5px] text-slate-500">
            {activity ? `${activity.week} call${activity.week > 1 ? "s" : ""} ces 7 derniers jours` : "Activité indisponible"}
            {activity?.lastAt ? ` · dernier le ${formatDay(activity.lastAt)}` : activity ? " · aucun call récent" : ""}
          </p>
        </div>
        {deals.length > 0 && (
          <button onClick={() => setOpen((v) => !v)} className="text-[13px] font-medium text-[color:var(--violet)] hover:underline">
            {open ? "Replier ses deals" : `Voir ses deals (${deals.length})`}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {deals.length === 0 ? (
          <span className="text-[13px] text-slate-400">Aucun deal suivi.</span>
        ) : (
          FOCUS_ORDER.map((k) => (
            <span key={k} className={`rounded-full px-2.5 py-1 text-[12.5px] font-medium ${counts[k] > 0 ? FOCUS[k].tone : "bg-slate-50 text-slate-400"}`}>
              {counts[k]} {FOCUS[k].label.toLowerCase()}
            </span>
          ))
        )}
      </div>

      {row.deals > 0 && (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="inline text-slate-500">Prochaine étape datée : </dt>
            <dd className="inline text-slate-900">
              {row.datedNextStepShare === null ? "—" : `${Math.round(row.datedNextStepShare * 100)} % de ses deals`}
            </dd>
          </div>
          <div>
            <dt className="inline text-slate-500">Point à travailler : </dt>
            <dd className="inline">
              {row.recurring ? (
                <>
                  <span className="text-slate-900">{alertLabel(row.recurring.rule)}</span>
                  <span className="text-slate-500"> · sur {row.recurring.count} deals</span>
                </>
              ) : (
                <span className="text-slate-400">rien de récurrent</span>
              )}
            </dd>
          </div>
        </dl>
      )}

      {open && deals.length > 0 && (
        <div className="-mx-5 -mb-5 mt-4 border-t border-border">
          <DealList deals={deals} />
        </div>
      )}
    </section>
  );
}

function TeamView({
  team,
  people,
  activity,
  progress,
}: {
  team: TeamRow[];
  people: Record<string, string>;
  activity: Record<string, { week: number; lastAt: string | null }>;
  progress: Record<string, DealProgress[]>;
}) {
  // Les personnes qui ont des deals ou de l'activité récente ; les autres
  // n'ont rien à montrer.
  // Ceux dont les deals reculent ou stagnent passent devant.
  const weight = (id: string) => {
    const list = progress[id] ?? [];
    return list.filter((d) => d.focus.status === "relancer").length * 100 + list.filter((d) => d.focus.status === "traiter").length;
  };
  const rows = team
    .filter((t) => t.deals > 0 || (progress[t.userId]?.length ?? 0) > 0 || (activity[t.userId]?.lastAt ?? null) !== null)
    .sort((a, b) => weight(b.userId) - weight(a.userId));
  if (rows.length === 0)
    return <p className={`${CARD} p-5 text-[13.5px] text-slate-500`}>Aucune activité ni aucun deal suivi dans votre équipe pour l&apos;instant.</p>;
  return (
    <div className="space-y-3">
      {rows.map((t) => (
        <TeamMember key={t.userId} row={t} name={people[t.userId] ?? "—"} activity={activity[t.userId]} deals={progress[t.userId] ?? []} />
      ))}
    </div>
  );
}

export default function DealsBoardClient({
  deals,
  stages,
  team,
  activity,
  progress,
  impact,
  impactWindowDays,
  people,
  initialTab,
  initialStage,
}: {
  deals: BoardDeal[];
  stages: StageColumn[];
  team: TeamRow[];
  activity: Record<string, { week: number; lastAt: string | null }>;
  progress: Record<string, DealProgress[]>;
  impact: AlertImpact | null;
  impactWindowDays: number;
  people: Record<string, string>;
  initialTab: "file" | "equipe" | "regles";
  initialStage: string | null;
}) {
  const [tab, setTab] = useState(initialTab);
  const [stage, setStage] = useState<string | null>(initialStage);

  const inStage = (d: BoardDeal) => !stage || (d.hubspot?.stage ?? "hors-hubspot") === stage;
  const queue = deals.filter((d) => !d.hiddenBecause && d.alerts.length > 0 && inStage(d));
  const moving = deals.filter((d) => !d.hiddenBecause && d.alerts.length === 0 && inStage(d));
  const reviewed = deals.filter((d) => d.hiddenBecause && inStage(d));

  return (
    <div className="space-y-6">
      <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
        {(
          [
            ["equipe", "Équipe"],
            ["file", "Où intervenir"],
            ["regles", "Règles"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`h-8 rounded-full px-3.5 text-[13px] font-medium ${tab === key ? "bg-white text-slate-900 shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]" : "text-slate-500 hover:text-slate-900"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "file" ? (
        <>
          {impact && <ImpactStrip impact={impact} windowDays={impactWindowDays} />}
          <StageBanner stages={stages} active={stage} onSelect={setStage} />
          <section>
            <h2 className={`${LABEL} mb-3`}>
              Où intervenir ({queue.length}){stage ? ` · ${stages.find((s) => s.key === stage)?.label ?? ""}` : ""}
            </h2>
            {queue.length === 0 ? (
              <p className={`${CARD} p-5 text-[13.5px] text-slate-500`}>Rien à signaler sur les derniers calls de votre équipe.</p>
            ) : (
              <div className="space-y-3">
                {queue.map((d) => (
                  <DealCard key={d.id} deal={d} owner={people[d.ownerId] ?? ""} />
                ))}
              </div>
            )}
          </section>
          <Folded title="Deals qui avancent" deals={moving} people={people} />
          <Folded title="Vus ou remis à plus tard" deals={reviewed} people={people} />
        </>
      ) : (
        tab === "regles" ? (
          <DealRulesForm stageLabels={Object.fromEntries(stages.filter((st) => st.index).map((st) => [st.index as number, st.label]))} />
        ) : (
          <TeamView team={team} people={people} activity={activity} progress={progress} />
        )
      )}
    </div>
  );
}
