"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Circle, Clock3, FileText, Layers, Target, Wallet } from "lucide-react";
import DealAvatar from "@/app/components/DealAvatar";
import { VERDICTS } from "@/app/mes-deals/deal-ui";
import type { DealProgress } from "@/lib/deal-progress";
import { commitmentKey, type DealMacro, type MacroCommitment } from "@/lib/deal-macro";

// Vue Deal « macro » (synthèse produit du 03/11/2026, validée par Jean) : un
// en-tête compact, UNE priorité, les engagements, l'état du deal, un
// historique léger. Le détail d'un call s'ouvre depuis l'historique.

export type MacroPriority = { title: string; why: string; action: string | null; tags: string[] };

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
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })
    .toUpperCase();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STATE = {
  confirme: { label: "Confirmé", tone: "bg-emerald-50 text-emerald-700" },
  a_preciser: { label: "À préciser", tone: "bg-amber-50 text-amber-700" },
  inconnu: { label: "Inconnu", tone: "bg-slate-100 text-slate-500" },
} as const;

const DOT = { done: "bg-emerald-500", late: "bg-rose-500", next: "bg-slate-300" } as const;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-xs)] sm:p-6 ${className}`}>{children}</section>;
}

function CardTitle({ icon: Icon, children }: { icon: typeof Target; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-[16px] font-semibold text-slate-900">
      <Icon className="h-[18px] w-[18px] text-slate-700" strokeWidth={2} />
      {children}
    </h2>
  );
}

function Commitment({ c, checked, canToggle, onToggle }: { c: MacroCommitment; checked: boolean; canToggle: boolean; onToggle: () => void }) {
  const status = checked ? "fait" : c.status;
  const icon =
    status === "fait" ? (
      <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
    ) : status === "retard" ? (
      <span className="block h-[18px] w-[18px] rounded-full border-2 border-rose-500 bg-rose-50" />
    ) : (
      <Circle className="h-[18px] w-[18px] text-slate-300" />
    );
  return (
    <li className="flex items-start gap-3 py-3">
      {canToggle ? (
        <button onClick={onToggle} aria-label={checked ? "Marquer comme à faire" : "Marquer comme fait"} title={checked ? "Marquer comme à faire" : "Marquer comme fait"} className="mt-0.5 shrink-0">
          {icon}
        </button>
      ) : (
        <span className="mt-0.5 shrink-0">{icon}</span>
      )}
      <p className={`text-[13.5px] leading-relaxed ${status === "fait" ? "text-slate-400" : "text-slate-700"}`}>
        <span className={`font-semibold ${status === "fait" ? "text-emerald-700" : status === "retard" ? "text-rose-600" : "text-slate-900"}`}>
          {status === "fait" ? (c.isMeeting ? "Tenu" : "Fait") : status === "retard" ? (c.isMeeting ? "Pas eu lieu" : "En retard") : "À faire"}
        </span>
        {" — "}
        <span className={status === "fait" ? "line-through" : ""}>{c.text}</span>
        {c.date && <span className="text-slate-500"> · prévu le {longDay(c.date, false)}</span>}
      </p>
    </li>
  );
}

export default function DealMacroView({
  dealId,
  progress: d,
  macro,
  owner,
  priority,
  canCheck,
  backHref,
  backLabel,
}: {
  dealId: string;
  progress: DealProgress;
  macro: DealMacro;
  owner: string;
  priority: MacroPriority;
  canCheck: boolean;
  backHref: string;
  backLabel: string;
}) {
  const v = VERDICTS[d.verdict];
  // Cochés à la main, en local d'abord (la base suit) ; un rendez-vous se
  // constate, il ne se coche pas.
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(macro.commitments.filter((c) => c.status === "fait" && !c.isMeeting).map((c) => commitmentKey(c.callId, c.index, c.text)))
  );
  const [error, setError] = useState<string | null>(null);

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

  const stage = d.hubspot?.stage ?? (macro.nextMeeting ? `R${macro.rank} → R${macro.nextMeeting.rank}` : `R${macro.rank}`);

  return (
    <div>
      <p className="text-[13px] text-slate-500">
        <Link href={backHref} className="hover:text-slate-900">
          {backLabel}
        </Link>
        <span className="mx-1.5 text-slate-300">›</span>
        <span className="text-slate-800">{d.name}</span>
      </p>

      {/* En-tête compact */}
      <header className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <DealAvatar d={d} size={46} />
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-semibold tracking-[-0.02em] text-slate-900 sm:text-[28px]">{d.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-slate-500">
              <span className="font-medium text-slate-700">{stage}</span>
              <span>·</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${v.tone}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${v.dot}`} />
                {v.label}
              </span>
              <span>·</span>
              <span>Owner : {owner.split(" ")[0]}</span>
            </p>
            <p className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-[13px] text-slate-700">
              <CalendarDays className="h-3.5 w-3.5" />
              {macro.nextMeeting ? <>Prochain RDV : {capitalize(longDay(macro.nextMeeting.date))}</> : <span className="text-slate-500">Aucun prochain RDV daté</span>}
            </p>
          </div>
        </div>
        {macro.amount !== null && (
          <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-slate-100 px-3.5 py-2 text-[14px] font-medium text-slate-800">
            <Wallet className="h-4 w-4 text-slate-500" />
            {`${Math.round(macro.amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")}\u00a0€`}
          </span>
        )}
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Priorité Brief : UNE recommandation */}
        <Card className="bg-gradient-to-b from-blue-50/50 to-white">
          <CardTitle icon={Target}>Priorité Brief</CardTitle>
          <p className="mt-3 text-[20px] font-semibold leading-snug tracking-[-0.01em] text-slate-900 sm:text-[21px]">{priority.title}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{priority.why}</p>
          {priority.action && (
            <p className="mt-3 rounded-xl bg-blue-50 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-slate-800">
              <span className="mr-1.5 text-[var(--violet)]">→</span>
              {priority.action}
            </p>
          )}
          {priority.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {priority.tags.map((t) => (
                <span key={t} className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-medium text-amber-700">
                  {t}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Actions & engagements */}
        <Card>
          <CardTitle icon={CheckCircle2}>Actions &amp; engagements</CardTitle>
          <ul className="mt-3 divide-y divide-slate-100">
            {macro.commitments.length === 0 && <li className="py-3 text-[13.5px] text-slate-400">Aucun engagement relevé au dernier call.</li>}
            {macro.commitments.map((c) => {
              const key = commitmentKey(c.callId, c.index, c.text);
              return <Commitment key={key} c={c} checked={checked.has(key)} canToggle={canCheck && !c.isMeeting} onToggle={() => toggle(c)} />;
            })}
          </ul>
          {error && <p className="mt-1 text-[12.5px] text-rose-600">{error}</p>}
          {macro.nextMeeting && (
            <p className="mt-2 flex items-center gap-2.5 rounded-xl bg-blue-50 px-3.5 py-2.5 text-[13.5px] text-slate-800">
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--violet)]" />
              <span>
                <span className="font-semibold">Prochain rendez-vous</span> — R{macro.nextMeeting.rank} · {capitalize(longDay(macro.nextMeeting.date))}
              </span>
            </p>
          )}
        </Card>
      </div>

      {/* État du deal */}
      <Card className="mt-4">
        <CardTitle icon={Layers}>État du deal</CardTitle>
        <div className="mt-3 divide-y divide-slate-100">
          {macro.state.map((r) => (
            <div key={r.key} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[180px_120px_minmax(0,1fr)] sm:items-center sm:gap-4">
              <span className="text-[14px] font-semibold text-slate-900">{r.label}</span>
              <span>
                <span className={`inline-block rounded-md px-2 py-0.5 text-[12px] font-medium ${STATE[r.status].tone}`}>{STATE[r.status].label}</span>
              </span>
              <span className="text-[13.5px] leading-relaxed text-slate-600">{r.text ?? "—"}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Synthèse du dernier call (04/11/2026) */}
      {macro.synthesis && (
        <Card className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <CardTitle icon={FileText}>Synthèse du R{macro.synthesis.rank}</CardTitle>
            {macro.synthesis.date && <span className="text-[13px] text-slate-500">{capitalize(longDay(macro.synthesis.date))}</span>}
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-slate-700">{macro.synthesis.text}</p>
          <Link href={`/feedback/${macro.synthesis.callId}`} className="mt-2 inline-block text-[13px] font-medium text-[var(--violet)] hover:underline">
            Voir le meeting →
          </Link>
        </Card>
      )}

      {/* Historique léger */}
      <Card className="mt-4">
        <CardTitle icon={Clock3}>Historique du deal</CardTitle>
        <ol className="relative mt-4">
          <span className="absolute bottom-3 left-[5px] top-3 w-px bg-slate-200" />
          {macro.history.map((h, i) => (
            <li key={i} className="relative grid grid-cols-1 gap-1 pb-5 pl-7 last:pb-0 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
              <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-white ${DOT[h.tone]}`} />
              <span className="text-[13px] text-slate-500">
                {shortDay(h.date)} · <span className="font-semibold text-slate-800">{h.label}</span>
              </span>
              <span className="text-[13.5px] leading-relaxed text-slate-700">
                <span className={h.tone === "late" ? "text-rose-600" : ""}>{h.text}</span>
                {h.callId && (
                  <Link href={`/feedback/${h.callId}`} className="mt-0.5 block text-[13px] font-medium text-[var(--violet)] hover:underline">
                    Voir le meeting →
                  </Link>
                )}
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
