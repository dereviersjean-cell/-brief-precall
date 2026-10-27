"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { alertLabel, formatDays, type BoardDeal, type StageColumn, type TeamRow } from "@/lib/deal-board";

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
        <h3 className="text-[15px] font-semibold text-slate-900">{deal.name}</h3>
        <p className="text-[12.5px] text-slate-500">
          {owner}
          {hubspot?.stage ? ` · ${hubspot.stage}` : ""}
          {hubspot?.amount != null ? ` · ${formatAmount(hubspot.amount)}` : ""}
        </p>
      </div>
      <p className="mt-1 text-[12.5px] text-slate-500">
        {deal.callCount} call{deal.callCount > 1 ? "s" : ""} · dernier :{" "}
        <Link href={`/feedback/${deal.lastCall.id}?tab=deal`} className="font-medium text-[color:var(--violet)] hover:underline">
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

function TeamTable({ team, people }: { team: TeamRow[]; people: Record<string, string> }) {
  if (team.length === 0)
    return <p className={`${CARD} p-5 text-[13.5px] text-slate-500`}>Aucun deal suivi dans votre équipe pour l&apos;instant.</p>;
  return (
    <div className={`${CARD} overflow-x-auto`}>
      <table className="stacked-table w-full text-left text-[13.5px] sm:min-w-[720px]">
        <thead>
          <tr className="border-b border-border text-[12px] text-slate-500">
            <th className="px-4 py-3 font-medium">Commercial</th>
            <th className="px-4 py-3 font-medium">Deals</th>
            <th className="px-4 py-3 font-medium">À risque</th>
            <th className="px-4 py-3 font-medium">Prochaine étape datée</th>
            <th className="px-4 py-3 font-medium">Point à travailler</th>
          </tr>
        </thead>
        <tbody>
          {team.map((t) => (
            <tr key={t.userId} className="border-b border-border last:border-0 align-top">
              <td className="px-4 py-3 font-medium text-slate-900">{people[t.userId] ?? "—"}</td>
              <td className="px-4 py-3" data-label="Deals">
                {t.deals}
              </td>
              <td className="px-4 py-3" data-label="À risque">
                {t.atRisk}
              </td>
              <td className="px-4 py-3" data-label="Prochaine étape datée">
                {t.datedNextStepShare === null ? "—" : `${Math.round(t.datedNextStepShare * 100)} %`}
              </td>
              <td className="px-4 py-3" data-label="Point à travailler">
                {t.recurring ? (
                  <>
                    <span className="text-slate-900">{alertLabel(t.recurring.rule)}</span>
                    <span className="text-slate-500"> · sur {t.recurring.count} deals</span>
                    <span className="mt-1 block text-[12.5px]">
                      {t.recurring.calls.map((c, i) => (
                        <span key={c.id}>
                          {i > 0 ? " · " : ""}
                          <Link href={`/feedback/${c.id}?tab=deal`} className="text-[color:var(--violet)] hover:underline">
                            {c.label}
                          </Link>
                        </span>
                      ))}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">Rien de récurrent</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DealsBoardClient({
  deals,
  stages,
  team,
  people,
  initialTab,
  initialStage,
}: {
  deals: BoardDeal[];
  stages: StageColumn[];
  team: TeamRow[];
  people: Record<string, string>;
  initialTab: "file" | "equipe";
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
            ["file", "À suivre"],
            ["equipe", "Équipe"],
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
        <TeamTable team={team} people={people} />
      )}
    </div>
  );
}
