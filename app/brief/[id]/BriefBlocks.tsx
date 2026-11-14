"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { Brief, BriefFollowUp, BriefReference, ReferenceLevel, TalkingPoint } from "@/lib/types";
import type { DealBriefContext } from "@/lib/deal-brief";
import { MEETING_ORIGINS, type MeetingContext } from "@/lib/meeting-origin";
import { StatusChip } from "@/app/components/ui/ui-bits";

// Les blocs du brief (maquettes choisies par Jean le 14/11/2026, d'après les
// retours d'Hubert) : un R1 en deux colonnes, « à dire » à gauche et « à
// savoir » à droite ; un R2 et plus avec les priorités d'abord. Consigne
// générale : concis, une idée par bloc, pas de phrase d'explication.

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em]";
const CARD =
  "min-w-0 rounded-[20px] bg-white p-5 ring-1 ring-[color:var(--lavender-strong)] shadow-[0_1px_2px_rgba(42,92,224,0.05),0_10px_28px_-20px_rgba(42,92,224,0.35)]";
const TITLE = "text-[16px] font-semibold tracking-[-0.01em] text-slate-900";

function day(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

function Question({ label = "Question à poser", children }: { label?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-[color:var(--lavender)] px-3.5 py-2.5">
      <p className={`${LABEL} text-[color:var(--violet)]`}>{label}</p>
      <p className="mt-0.5 text-[14px] font-medium leading-snug text-slate-900">{children}</p>
    </div>
  );
}

const quoted = (text: string) => (/^[«"]/.test(text.trim()) ? text : `« ${text} »`);

// « Contexte… Question : … » → [contexte, question] : les briefs d'avant le
// 14/11/2026 rangeaient la question à la fin du détail.
function splitQuestion(point: TalkingPoint): [string, string | null] {
  if (point.question) return [point.detail, point.question];
  const m = point.detail.match(/^([\s\S]*?)\s*Question\s*:\s*([\s\S]+)$/i);
  if (!m) return [point.detail, null];
  const q = m[2].trim();
  return [m[1].trim(), q.charAt(0).toUpperCase() + q.slice(1)];
}

// ── Contexte du rendez-vous ────────────────────────────────────────────────

export function MeetingContextBox({
  briefId,
  value,
  rank,
  onSaved,
}: {
  briefId: string;
  value: MeetingContext | undefined;
  rank: string;
  onSaved: (next: MeetingContext) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [origin, setOrigin] = useState(value?.origin ?? "");
  const [note, setNote] = useState(value?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/briefs/${encodeURIComponent(briefId)}/context`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Enregistrement impossible.");
        return;
      }
      onSaved(data.meetingContext as MeetingContext);
      setEditing(false);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Contexte du rendez-vous" className="min-w-0 rounded-2xl bg-[color:var(--lavender)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${LABEL} text-slate-500`}>Contexte du rendez-vous</span>
        <span className="rounded-md bg-[color:var(--violet)] px-1.5 py-0.5 text-[12px] font-bold text-white">{rank}</span>
        <span className="rounded-full bg-white px-2.5 py-0.5 text-[12.5px] text-slate-700">
          {value?.origin ? `Origine : ${value.origin.toLowerCase()}` : "Origine à préciser"}
        </span>
        {!editing && (
          <button onClick={() => setEditing(true)} className="ml-auto text-[12.5px] font-semibold text-[color:var(--violet)] hover:underline">
            {value ? "Modifier" : "Préciser"}
          </button>
        )}
      </div>
      {!editing && value?.note && <p className="mt-2 text-[13.5px] leading-snug text-slate-700">{value.note}</p>}
      {editing && (
        <div className="mt-3 space-y-2">
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            aria-label="Origine du rendez-vous"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
          >
            <option value="">Origine du rendez-vous</option>
            {MEETING_ORIGINS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={400}
            aria-label="Pourquoi le prospect a accepté le rendez-vous"
            placeholder="Pourquoi le prospect a accepté le rendez-vous"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          {error && <p className="text-[12.5px] text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="inline-flex h-8 items-center rounded-lg border border-border bg-white px-3 text-[12.5px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              onClick={save}
              disabled={saving || (!origin && !note.trim())}
              className="inline-flex h-8 items-center rounded-lg bg-[color:var(--primary)] px-3 text-[12.5px] font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Brief d'un R1 ──────────────────────────────────────────────────────────

export function OpeningCard({ line }: { line: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className={`${CARD} border-l-4 border-[color:var(--violet)]`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={TITLE}>Accroche</h2>
        <button
          onClick={() => {
            navigator.clipboard
              ?.writeText(line)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => {});
          }}
          className="rounded-lg border border-[color:var(--lavender-strong)] bg-white px-3 py-1 text-[12.5px] font-semibold text-[color:var(--violet)] hover:bg-[color:var(--lavender)]"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="mt-2.5 text-[18px] font-medium leading-snug tracking-[-0.01em] text-slate-900">{quoted(line)}</p>
    </section>
  );
}

export function StakesCard({ points }: { points: TalkingPoint[] }) {
  return (
    <section className={CARD}>
      <h2 className={TITLE}>Enjeux à explorer</h2>
      <ol className="mt-1 divide-y divide-border">
        {points.slice(0, 3).map((p, i) => {
          const [context, question] = splitQuestion(p);
          return (
            <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-2 py-3.5 last:pb-0">
              <span className="pt-0.5 text-[12.5px] font-bold tabular-nums text-[color:var(--violet)]">0{i + 1}</span>
              <div className="min-w-0 space-y-2">
                <p className="text-[14.5px] font-semibold leading-snug text-slate-900">{p.title}</p>
                {context && <p className="text-[13.5px] leading-snug text-slate-600">{context}</p>}
                {question && <Question>{quoted(question)}</Question>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

const LEVELS: Record<ReferenceLevel, { label: string; tone: "success" | "info" | "neutral" }> = {
  roi: { label: "Preuve de ROI", tone: "success" },
  cas_usage: { label: "Cas d'usage", tone: "info" },
  simple: { label: "Référence simple", tone: "neutral" },
};

function ReferenceItem({ reference }: { reference: BriefReference }) {
  const level = reference.level ? LEVELS[reference.level] : null;
  return (
    <div className="min-w-0 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px] font-semibold text-slate-900">{reference.client_name}</p>
        {level && <StatusChip tone={level.tone}>{level.label}</StatusChip>}
      </div>
      {reference.relevance && <p className="mt-1.5 text-[13px] leading-snug text-slate-600">{reference.relevance}</p>}
      <div className={`mt-3 rounded-xl px-3.5 py-2.5 ${reference.level === "roi" ? "bg-[color:var(--success-soft)]" : "bg-slate-50"}`}>
        <p className={`${LABEL} ${reference.level === "roi" ? "text-emerald-700" : "text-slate-500"}`}>À dire</p>
        <p className="mt-0.5 text-[14px] font-medium leading-snug text-slate-900">{reference.pitch}</p>
      </div>
    </div>
  );
}

export function ReferencesCard({ references }: { references: BriefReference[] }) {
  const shown = references.slice(0, 2);
  return (
    <section className={CARD}>
      <h2 className={TITLE}>Références et preuves commerciales</h2>
      <div className={`mt-3 grid grid-cols-1 gap-3 ${shown.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {shown.map((r, i) => (
          <ReferenceItem key={i} reference={r} />
        ))}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className={`${LABEL} text-slate-500`}>{label}</p>
      <div className="mt-1 text-[13.5px] leading-snug text-slate-800">{children}</div>
    </div>
  );
}

export function CompanyCard({ brief, name, website }: { brief: Brief; name: string; website?: string }) {
  const company = brief.company;
  const news = company?.news || brief.actualites?.[0]?.titre;
  const figures = [...(company?.keyFigures ?? []), ...(company ? [] : [brief.employees, brief.revenue].filter((v): v is string => !!v))];
  return (
    <section className={CARD}>
      <h2 className={TITLE}>
        Entreprise <span className="text-[13.5px] font-medium text-slate-500">· {name}</span>
      </h2>
      <div className="mt-3 space-y-3">
        {brief.companyOverview && <Row label="Activité">{brief.companyOverview}</Row>}
        {company?.clients && <Row label="Clients et utilisateurs">{company.clients}</Row>}
        {figures.length > 0 && (
          <Row label="Chiffres clés">
            <div className="flex flex-wrap gap-1.5">
              {figures.map((f) => (
                <span key={f} className="rounded-full bg-slate-100 px-2.5 py-1 text-[12.5px] text-slate-700">
                  {f}
                </span>
              ))}
            </div>
          </Row>
        )}
        {company && <Row label="Actualité">{news || <span className="text-slate-500">Aucune actualité récente trouvée.</span>}</Row>}
        {!company && news && <Row label="Actualité">{news}</Row>}
        {website && <p className="break-all text-[13px] font-medium text-[color:var(--violet)]">{website}</p>}
      </div>
    </section>
  );
}

// ── Brief d'un R2 et plus ──────────────────────────────────────────────────

export function PrioritiesCard({ followUp }: { followUp: BriefFollowUp }) {
  return (
    <section className={`${CARD} ring-2 ring-[color:var(--violet)]`}>
      <p className={`${LABEL} text-[color:var(--violet)]`}>Priorités du prochain rendez-vous</p>
      <h2 className={`${TITLE} mt-0.5`}>Ce qu&apos;il faut clarifier ou obtenir</h2>
      {followUp.opening && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[14px] leading-snug text-slate-800">
          <span className="font-semibold text-slate-900">Pour ouvrir :</span> {followUp.opening}
        </p>
      )}
      <ol className="mt-1 divide-y divide-border">
        {followUp.priorities.slice(0, 3).map((p, i) => (
          <li key={i} className="grid grid-cols-[34px_minmax(0,1fr)] gap-x-2 py-4">
            <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[color:var(--violet)] text-[13px] font-bold text-white">{i + 1}</span>
            <div className="min-w-0 space-y-2.5">
              <p className="text-[15px] font-semibold leading-snug text-slate-900">{p.title}</p>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-[13.5px] leading-snug sm:grid-cols-[150px_minmax(0,1fr)]">
                {p.missing && (
                  <>
                    <dt className={`${LABEL} pt-0.5 text-slate-500`}>Ce qui manque</dt>
                    <dd className="text-slate-800">{p.missing}</dd>
                  </>
                )}
                {p.why && (
                  <>
                    <dt className={`${LABEL} pt-0.5 text-slate-500`}>Pourquoi c&apos;est important</dt>
                    <dd className="text-slate-600">{p.why}</dd>
                  </>
                )}
              </dl>
              {p.question && <Question>{quoted(p.question)}</Question>}
            </div>
          </li>
        ))}
      </ol>
      {followUp.nextStep && (
        <div className="rounded-xl bg-[color:var(--success-soft)] px-4 py-3">
          <p className={`${LABEL} text-emerald-700`}>Prochaine étape à obtenir avant de raccrocher</p>
          <p className="mt-0.5 text-[14.5px] font-semibold leading-snug text-emerald-800">{followUp.nextStep}</p>
        </div>
      )}
    </section>
  );
}

export function ProofsCard({ followUp, references }: { followUp: BriefFollowUp; references: BriefReference[] }) {
  if (followUp.proofs.length === 0 && references.length === 0) return null;
  return (
    <section className={CARD}>
      <p className={`${LABEL} text-[color:var(--violet)]`}>Pour convaincre</p>
      <h2 className={`${TITLE} mt-0.5`}>Preuves et références</h2>
      {followUp.proofs.length > 0 && (
        <div className={`mt-3 grid grid-cols-1 gap-3 ${followUp.proofs.length > 1 ? "sm:grid-cols-2" : ""} ${followUp.proofs.length > 2 ? "lg:grid-cols-3" : ""}`}>
          {followUp.proofs.slice(0, 3).map((p, i) => (
            <div key={i} className="min-w-0 rounded-2xl border border-border p-3.5">
              <p className={`${LABEL} text-slate-500`}>Frein exprimé</p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-slate-600">{p.blocker}</p>
              <p className={`${LABEL} mt-2.5 text-[color:var(--violet)]`}>Ce qui y répond</p>
              <p className="mt-0.5 text-[13.5px] font-medium leading-snug text-slate-900">{p.answer}</p>
            </div>
          ))}
        </div>
      )}
      {references.length > 0 && (
        <div className={`mt-3 grid grid-cols-1 gap-3 ${references.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {references.slice(0, 2).map((r, i) => (
            <ReferenceItem key={i} reference={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`${LABEL} text-slate-500`}>{label}</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13.5px] leading-snug text-slate-800 marker:text-slate-400">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function RecapCard({ ctx, followUp }: { ctx: DealBriefContext; followUp: BriefFollowUp }) {
  const ours = followUp.commitments?.ours ?? [];
  const theirs = followUp.commitments?.theirs ?? [];
  const fallback = ours.length === 0 && theirs.length === 0 ? ctx.engagements.map((e) => (e.date ? `${day(e.date)} : ${e.text}` : e.text)) : [];
  return (
    <section className={CARD}>
      <p className={`${LABEL} text-[color:var(--violet)]`}>Rappel du contexte</p>
      <h2 className={`${TITLE} mt-0.5`}>Où en sommes-nous ?</h2>
      <p className="mt-1 text-[12.5px] text-slate-500">
        <span className="mr-1.5 rounded-md bg-[color:var(--violet)] px-1.5 py-0.5 text-[11.5px] font-bold text-white">R{ctx.callNumber}</span>
        <Link href={`/deal/${ctx.dealId}`} className="font-semibold text-[color:var(--violet)] hover:underline">
          {ctx.dealName}
        </Link>
        {ctx.lastCall.at && <> · dernier échange le {day(ctx.lastCall.at)}</>}
      </p>
      {followUp.recap && <p className="mt-3 text-[13.5px] leading-relaxed text-slate-800">{followUp.recap}</p>}
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {ctx.checklist.map((c) => (
          <li
            key={c.label}
            title={c.text ?? undefined}
            className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
              c.done ? "bg-[color:var(--success-soft)] text-emerald-700" : c.vague ? "bg-[color:var(--warning-soft)] text-amber-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {c.done ? "✓ " : c.vague ? "~ " : ""}
            {c.label}
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-3.5">
        <List label="Objections soulevées" items={ctx.objections.slice(0, 3)} />
        <List label="À faire de notre côté" items={ours} />
        <List label="Attendu du prospect" items={theirs} />
        <List label="Engagements pris" items={fallback} />
      </div>
    </section>
  );
}
