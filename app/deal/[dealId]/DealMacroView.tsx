"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import DealAvatar from "@/app/components/DealAvatar";
import { StateChip } from "@/app/mes-deals/deal-ui";
import type { DealState } from "@/lib/deal-progress";
import { commitmentKey, type DealMacro, type MacroCommitment } from "@/lib/deal-macro";

// Page d'un deal (maquette B choisie par Jean le 14/11/2026, d'après les
// réponses de Jean et d'Hubert au questionnaire) : à gauche ce qu'il faut
// faire — la Priorité Brief, les actions et engagements en deux listes,
// l'historique ; à droite où en est le deal — état, étape, montant, synthèse,
// critères. Consigne : concis, une idée par bloc.

export type MacroPriority = { title: string; why: string; action: string | null };

// Ce que la page affiche du deal lui-même : jamais tout l'objet DealProgress,
// qui serait sérialisé dans la page.
export type DealHeader = { name: string; domain: string | null; state: DealState; stateReason: string; stage: string | null; owner: string };

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500";

function longDay(iso: string, weekday = true): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", {
    ...(weekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
}

function shortDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const euros = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

const CRITERION = {
  confirme: { label: "Confirmé", tone: "bg-emerald-50 text-emerald-700" },
  a_preciser: { label: "À préciser", tone: "bg-amber-50 text-amber-700" },
  inconnu: { label: "Inconnu", tone: "bg-slate-100 text-slate-500" },
} as const;

const STATUS = {
  fait: { label: "Fait", tone: "bg-emerald-50 text-emerald-700" },
  retard: { label: "En retard", tone: "bg-rose-50 text-rose-700" },
  a_faire: { label: "À faire", tone: "bg-amber-50 text-amber-700" },
  attente: { label: "En attente", tone: "bg-slate-100 text-slate-600" },
} as const;

const CLOSURE = { gagne: "Gagné", perdu: "Perdu", abandonne: "Abandonné" } as const;
const CLOSE_BUTTON =
  "inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13.5px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50";

const DOT = { done: "bg-emerald-500", late: "bg-rose-500", next: "bg-slate-300" } as const;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-xs)] ${className}`}>{children}</section>;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={LABEL}>{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[14.5px] font-semibold text-slate-900">{children}</div>
    </div>
  );
}

function Source({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-border px-1.5 py-px text-[11.5px] font-medium text-slate-500">{children}</span>;
}

function Commitment({ c, checked, canToggle, onToggle }: { c: MacroCommitment; checked: boolean; canToggle: boolean; onToggle: () => void }) {
  const done = checked || c.status === "fait";
  // Un engagement du prospect ne se « fait » pas de notre côté : on l'attend.
  const status = done ? STATUS.fait : c.status === "retard" ? STATUS.retard : c.side === "prospect" ? STATUS.attente : STATUS.a_faire;
  const label = done && c.isMeeting ? "Tenu" : c.status === "retard" && !done && c.isMeeting ? "Pas eu lieu" : status.label;
  const icon = done ? <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" /> : <Circle className={`h-[18px] w-[18px] ${c.status === "retard" ? "text-rose-500" : "text-slate-300"}`} />;
  return (
    <li className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 py-2.5">
      {canToggle ? (
        <button onClick={onToggle} aria-label={checked ? "Marquer comme à faire" : "Marquer comme fait"} title={checked ? "Marquer comme à faire" : "Marquer comme fait"} className="mt-0.5">
          {icon}
        </button>
      ) : (
        <span className="mt-0.5">{icon}</span>
      )}
      <p className={`text-[13.5px] leading-snug ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>{c.text}</p>
      <span className="flex items-center gap-2 whitespace-nowrap">
        {c.date && <span className="text-[12.5px] text-slate-500">{shortDay(c.date)}</span>}
        <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${status.tone}`}>{label}</span>
      </span>
    </li>
  );
}

export default function DealMacroView({
  dealId,
  deal,
  macro,
  priority,
  canCheck,
  closure,
  suggestAbandon,
  backHref,
  backLabel,
}: {
  dealId: string;
  deal: DealHeader;
  macro: DealMacro;
  priority: MacroPriority;
  canCheck: boolean;
  // Clôture depuis Brief (migration 043) : null = deal en cours.
  closure: { status: "gagne" | "perdu" | "abandonne"; closedAt: string | null } | null;
  suggestAbandon: boolean;
  backHref: string;
  backLabel: string;
}) {
  // Cochés à la main, en local d'abord (la base suit) ; un rendez-vous se
  // constate, il ne se coche pas.
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(macro.commitments.filter((c) => c.status === "fait" && !c.isMeeting).map((c) => commitmentKey(c.callId, c.index, c.text)))
  );
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  async function close(status: "gagne" | "perdu" | "abandonne" | null) {
    const label = status ? CLOSURE[status].toLowerCase() : null;
    if (status && !window.confirm(`Marquer ${deal.name} comme ${label} ? Le deal sortira de vos deals en cours. HubSpot n'est pas modifié.`)) return;
    setClosing(true);
    setCloseError(null);
    const res = await fetch(`/api/deals/${dealId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string };
    setClosing(false);
    if (!res?.ok) {
      setCloseError(data?.error ?? "La clôture a échoué. Réessayez.");
      return;
    }
    router.refresh();
  }

  async function toggle(c: MacroCommitment) {
    const key = commitmentKey(c.callId, c.index, c.text);
    const done = !checked.has(key);
    const apply = (on: boolean) =>
      setChecked((prev) => {
        const next = new Set(prev);
        if (on) next.add(key);
        else next.delete(key);
        return next;
      });
    apply(done);
    setError(null);
    const res = await fetch(`/api/deals/${dealId}/commitments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId: c.callId, index: c.index, done }),
    }).catch(() => null);
    if (!res?.ok) {
      apply(!done);
      setError("L'engagement n'a pas pu être enregistré. Réessayez.");
    }
  }

  const list = (side: "nous" | "prospect") =>
    macro.commitments
      .filter((c) => c.side === side)
      .map((c) => {
        const key = commitmentKey(c.callId, c.index, c.text);
        return <Commitment key={key} c={c} checked={checked.has(key)} canToggle={canCheck && !c.isMeeting} onToggle={() => toggle(c)} />;
      });
  const ours = list("nous");
  const theirs = list("prospect");
  const confirmed = macro.state.filter((r) => r.status === "confirme").length;
  const synthesis = macro.dealSynthesis ?? macro.synthesis?.text ?? null;

  return (
    <div>
      <p className="text-[13px] text-slate-500">
        <Link href={backHref} className="hover:text-slate-900">
          {backLabel}
        </Link>
        <span className="mx-1.5 text-slate-300">›</span>
        <span className="text-slate-800">{deal.name}</span>
      </p>

      <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <DealAvatar d={{ name: deal.name, domain: deal.domain }} size={46} />
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[28px]">{deal.name}</h1>
            <p className="mt-0.5 text-[13.5px] text-slate-500">
              Suivi par {deal.owner.split(" ")[0]} · {macro.rank} rendez-vous
            </p>
          </div>
        </div>
        {!closure && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {(["gagne", "perdu", "abandonne"] as const).map((s) => (
              <button key={s} onClick={() => close(s)} disabled={closing} className={CLOSE_BUTTON}>
                {CLOSURE[s]}
              </button>
            ))}
          </div>
        )}
      </header>
      {closeError && <p className="mt-2 text-[13px] text-rose-700">{closeError}</p>}

      {closure && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white px-5 py-3.5">
          <p className="text-[14px] text-slate-800">
            <span className="font-semibold">Deal {CLOSURE[closure.status].toLowerCase()}</span>
            {closure.closedAt && <span className="text-slate-500"> le {longDay(closure.closedAt, false)}</span>}
          </p>
          <button onClick={() => close(null)} disabled={closing} className="text-[13.5px] font-semibold text-[color:var(--violet)] hover:underline disabled:opacity-50">
            Rouvrir
          </button>
        </div>
      )}
      {suggestAbandon && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-5 py-3.5">
          <p className="text-[14px] text-amber-900">Aucun échange depuis plus de 60 jours : relancer ce deal, ou l&apos;abandonner ?</p>
          <button onClick={() => close("abandonne")} disabled={closing} className={CLOSE_BUTTON}>
            Abandonner
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {/* Priorité Brief : UNE recommandation */}
          <Card className="ring-2 ring-[color:var(--violet)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">Priorité Brief</p>
            <h2 className="mt-1 text-[20px] font-semibold leading-snug tracking-[-0.01em] text-slate-900">{priority.title}</h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-[14px] leading-snug sm:grid-cols-[150px_minmax(0,1fr)]">
              <dt className={`${LABEL} pt-0.5`}>Pourquoi maintenant</dt>
              <dd className="text-slate-700">{priority.why}</dd>
              {priority.action && (
                <>
                  <dt className={`${LABEL} pt-0.5`}>Comment</dt>
                  <dd className="text-slate-900">{priority.action}</dd>
                </>
              )}
            </dl>
          </Card>

          {/* Actions et engagements : qui doit faire quoi, pour quand */}
          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">Actions et engagements</p>
            <h2 className="mt-0.5 text-[16px] font-semibold text-slate-900">Qui doit faire quoi, pour quand</h2>
            {macro.commitments.length === 0 && <p className="mt-3 text-[13.5px] text-slate-500">Aucun engagement relevé au dernier rendez-vous.</p>}
            {ours.length > 0 && (
              <div className="mt-4">
                <h3 className="text-[14px] font-semibold text-slate-900">À faire de notre côté</h3>
                <ul className="mt-1 divide-y divide-slate-100">{ours}</ul>
              </div>
            )}
            {theirs.length > 0 && (
              <div className="mt-4">
                <h3 className="text-[14px] font-semibold text-slate-900">Attendu du prospect</h3>
                <ul className="mt-1 divide-y divide-slate-100">{theirs}</ul>
              </div>
            )}
            {error && <p className="mt-1 text-[12.5px] text-rose-600">{error}</p>}
          </Card>

          {/* Historique : chaque ligne ouvre le meeting */}
          <Card>
            <h2 className="text-[16px] font-semibold text-slate-900">Historique</h2>
            <ol className="relative mt-4">
              <span className="absolute bottom-3 left-[5px] top-3 w-px bg-slate-200" />
              {macro.history.map((h, i) => (
                <li key={i} className="relative grid grid-cols-1 gap-1 pb-4 pl-7 last:pb-0 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-4">
                  <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-white ${DOT[h.tone]}`} />
                  <span className="text-[13px] text-slate-500">
                    {shortDay(h.date)} · <span className="font-semibold text-slate-800">{h.label}</span>
                  </span>
                  {h.callId ? (
                    <Link href={`/feedback/${h.callId}`} className="text-[13.5px] leading-snug text-slate-700 hover:text-[color:var(--violet)]">
                      {h.text}
                    </Link>
                  ) : (
                    <span className={`text-[13.5px] leading-snug ${h.tone === "late" ? "text-rose-600" : "text-slate-700"}`}>{h.text}</span>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4">
          <Card className="space-y-4">
            <div>
              <Fact label="État">
                <StateChip state={deal.state} />
              </Fact>
              <p className="mt-1.5 text-[13px] leading-snug text-slate-600">{deal.stateReason}</p>
            </div>
            <Fact label="Étape">
              R{macro.rank} · {deal.stage ?? <span className="font-medium text-slate-500">étape à confirmer</span>}
              {deal.stage && <Source>HubSpot</Source>}
            </Fact>
            <Fact label="Montant">
              {macro.amount !== null ? euros(macro.amount) : <span className="font-medium text-slate-500">Non renseigné</span>}
              {macro.amountSource === "hubspot" && <Source>HubSpot</Source>}
              {macro.amountSource === "calls" && <Source>Dit en rendez-vous, à confirmer</Source>}
            </Fact>
            <Fact label="Prochain rendez-vous">
              {macro.nextMeeting ? capitalize(longDay(macro.nextMeeting.date)) : <span className="font-medium text-slate-500">Aucun de daté</span>}
            </Fact>
          </Card>

          {synthesis && (
            <Card>
              <h2 className="text-[16px] font-semibold text-slate-900">Synthèse du deal</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-700">{synthesis}</p>
            </Card>
          )}

          <Card>
            <h2 className="text-[16px] font-semibold text-slate-900">
              État du deal{" "}
              <span className="text-[13.5px] font-medium text-slate-500">
                · {confirmed} sur {macro.state.length}
              </span>
            </h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {macro.state.map((r) => (
                <li key={r.key} title={r.text ?? undefined} className="flex items-center justify-between gap-3 py-2 text-[13.5px]">
                  <span className={r.alert ? "font-semibold text-rose-700" : "text-slate-800"}>{r.label}</span>
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${r.alert ? "bg-rose-50 text-rose-700" : CRITERION[r.status].tone}`}>
                    {CRITERION[r.status].label}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
