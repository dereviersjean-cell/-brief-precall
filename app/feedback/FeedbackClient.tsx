"use client";

import { useState, useMemo } from "react";
import ConditionalLink from "@/app/components/ui/ConditionalLink";
import Link from "next/link";
import {
  Search,
  Mic,
  Mail,
  Play,
  Sparkles,
  TrendingUp,
  Radio,
  ChevronRight,
  Smile,
  Meh,
  Frown,
  Clock,
  CheckCircle2,
  FileEdit,
  Filter,
  ArrowDownUp,
} from "lucide-react";
import type { CallWithAnalysis } from "@/lib/db";
import { MEETING_STAGE_SHORT_LABELS, MEETING_STAGE_LABELS } from "@/lib/meeting-stage";
import { deriveNameFromEmail } from "@/lib/format";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/ui-bits";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const weekdayDate = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  if (isSameDay(d, now)) return `Aujourd'hui · ${weekdayDate}`;
  if (isSameDay(d, yesterday)) return `Hier · ${weekdayDate}`;
  return weekdayDate.charAt(0).toUpperCase() + weekdayDate.slice(1);
}

function scoreTone(v: number | null) {
  if (v == null) return { bar: "bg-slate-200", text: "text-slate-400" };
  if (v >= 3.5) return { bar: "bg-[color:var(--success)]", text: "text-emerald-700" };
  if (v >= 2) return { bar: "bg-[color:var(--warning)]", text: "text-amber-700" };
  return { bar: "bg-[color:var(--danger)]", text: "text-rose-700" };
}

type FollowUpState = "envoye" | "brouillon" | "aucun";

// Enriched once per render rather than recomputed in every filter/group pass.
type Row = {
  call: CallWithAnalysis;
  contactName: string;
  score: number | null;
  sentiment: string | null;
  followUp: FollowUpState;
  dateIso: string;
  dateGroup: string;
};

type FilterKey = "all" | "todo" | "sent" | "negative";

export default function FeedbackClient({
  calls,
  // false sur /demo/feedback : ces calls n'existent pas en base.
  linksEnabled = true,
}: {
  calls: CallWithAnalysis[];
  linksEnabled?: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const rows: Row[] = useMemo(
    () =>
      calls.map((call) => {
        const dateIso = call.started_at ?? call.created_at;
        return {
          call,
          contactName: (call.contact_email ? deriveNameFromEmail(call.contact_email) : null) ?? call.contact_email ?? "Contact inconnu",
          score: call.analysis?.scores?.global_score ?? null,
          sentiment: call.analysis?.sentiment ?? null,
          followUp: call.follow_up_sent_at ? "envoye" : call.follow_up_email ? "brouillon" : "aucun",
          dateIso,
          dateGroup: dateGroupLabel(dateIso),
        };
      }),
    [calls]
  );

  const todoCount = rows.filter((r) => r.followUp === "aucun").length;
  const sentCount = rows.filter((r) => r.followUp === "envoye").length;
  const draftCount = rows.filter((r) => r.followUp === "brouillon").length;
  const negCount = rows.filter((r) => r.sentiment === "négatif").length;
  const scored = rows.filter((r) => r.score !== null);
  const avgScore = scored.length ? scored.reduce((s, r) => s + (r.score as number), 0) / scored.length : null;

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "todo" && r.followUp !== "aucun") return false;
      if (filter === "sent" && r.followUp !== "envoye") return false;
      if (filter === "negative" && r.sentiment !== "négatif") return false;
      if (query) {
        const q = query.trim().toLowerCase();
        const inName = r.contactName.toLowerCase().includes(q);
        const inEmail = (r.call.contact_email ?? "").toLowerCase().includes(q);
        const inCompany = (r.call.company_name ?? "").toLowerCase().includes(q);
        if (!inName && !inEmail && !inCompany) return false;
      }
      return true;
    });
  }, [rows, filter, query]);

  const grouped = useMemo(() => {
    const g: Record<string, Row[]> = {};
    for (const r of filtered) (g[r.dateGroup] ??= []).push(r);
    return Object.entries(g);
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <div data-tour="feedback-content" className="max-w-6xl mx-auto px-6 py-10">
        <PageHeader
          eyebrow="Analyse IA"
          title={
            <>
              Feedback <span className="italic-serif text-[color:var(--violet)]">post-call</span>
            </>
          }
          subtitle="Chaque visio enregistrée est transcrite, notée et résumée automatiquement."
          actions={
            <>
              <Button variant="outline" icon={<Sparkles className="h-3.5 w-3.5" />} disabled title="Bientôt disponible">
                Ré-analyser tout
              </Button>
              <Button variant="primary" icon={<Radio className="h-3.5 w-3.5" />} disabled title="Aucun bot programmé pour le moment">
                Bot actif
              </Button>
            </>
          }
        />

        {calls.length === 0 ? (
          <div className="mt-6 bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-12 text-center">
            <div className="w-12 h-12 bg-[color:var(--lavender)] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mic className="w-6 h-6 text-[color:var(--violet)]" strokeWidth={1.5} />
            </div>
            <p className="text-slate-700 font-medium">Aucun appel analysé pour l&apos;instant</p>
            <p className="text-slate-400 text-sm mt-1">
              Vos analyses apparaîtront ici après chaque appel enregistré via Recall.AI.
            </p>
          </div>
        ) : (
          <>
            {/* KPI strip */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiPill label="Calls analysés" value={calls.length.toString()} hint="au total" icon={<Mic className="h-4 w-4" />} />
              <KpiPill
                label="Score moyen"
                value={avgScore !== null ? avgScore.toFixed(1) : "—"}
                suffix={avgScore !== null ? "/5" : undefined}
                hint={`${scored.length} call${scored.length !== 1 ? "s" : ""} noté${scored.length !== 1 ? "s" : ""}`}
                tone={avgScore === null ? "neutral" : avgScore >= 3.5 ? "success" : avgScore >= 2 ? "warning" : "danger"}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <KpiPill
                label="Sentiment"
                value={negCount.toString()}
                suffix=" négatifs"
                hint={negCount > 0 ? "Vigilance recommandée" : "Rien à signaler"}
                tone={negCount > 0 ? "danger" : "success"}
                icon={<Frown className="h-4 w-4" />}
              />
              <KpiPill
                label="Suivi"
                value={sentCount.toString()}
                suffix=" envoyés"
                hint={`${draftCount} brouillon${draftCount !== 1 ? "s" : ""} · ${todoCount} à traiter`}
                tone="info"
                icon={<Mail className="h-4 w-4" />}
              />
            </div>

            {/* Filter bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-2 pl-3 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-1">
                <FilterTab active={filter === "all"} onClick={() => setFilter("all")} count={rows.length}>Tous</FilterTab>
                <FilterTab active={filter === "todo"} onClick={() => setFilter("todo")} count={todoCount}>À traiter</FilterTab>
                <FilterTab active={filter === "sent"} onClick={() => setFilter("sent")} count={sentCount}>Suivi envoyé</FilterTab>
                <FilterTab active={filter === "negative"} onClick={() => setFilter("negative")} count={negCount}>Sentiment négatif</FilterTab>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-[260px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-9 w-full rounded-md border border-border bg-white pl-8 pr-3 text-[13px] outline-none focus:border-[color:var(--violet)]"
                    placeholder="Rechercher un contact, une entreprise…"
                  />
                </div>
                <button
                  disabled
                  title="Bientôt disponible"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-[12.5px] text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Filter className="h-3.5 w-3.5" /> Filtres
                </button>
                <button
                  disabled
                  title="Déjà trié par date"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-2.5 text-[12.5px] text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownUp className="h-3.5 w-3.5" /> Date
                </button>
              </div>
            </div>

            {/* Grouped list */}
            <div className="mt-4 space-y-6">
              {grouped.map(([group, groupRows]) => (
                <section key={group}>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{group}</div>
                    <div className="h-px flex-1 bg-slate-200/70" />
                    <div className="text-[11px] text-slate-400 tabular-nums">{groupRows.length} call{groupRows.length > 1 ? "s" : ""}</div>
                  </div>
                  <div data-tour="feedback-list" className="overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-sm)] divide-y divide-slate-100">
                    {groupRows.map((r) => (
                      <CallRow key={r.call.id} row={r} linksEnabled={linksEnabled} />
                    ))}
                  </div>
                </section>
              ))}

              {grouped.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <div className="text-[14px] font-medium text-slate-700">Aucun call ne correspond à ce filtre.</div>
                  <div className="mt-1 text-[12.5px] text-slate-500">Essayez « Tous » ou modifiez votre recherche.</div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-xl border border-border bg-[color:var(--lavender)]/40 px-3.5 py-2.5 text-[12px] text-slate-600">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--violet)]" />
              Le bot Brief rejoint automatiquement vos visios et publie l&apos;analyse ici, en moyenne quelques minutes après la fin du call.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiPill({
  label,
  value,
  suffix,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const toneBg = {
    neutral: "bg-slate-100 text-slate-600",
    success: "bg-[color:var(--success-soft)] text-emerald-700",
    warning: "bg-[color:var(--warning-soft)] text-amber-700",
    danger: "bg-[color:var(--danger-soft)] text-rose-700",
    info: "bg-[color:var(--lavender)] text-[color:var(--violet)]",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
        <div className={`grid h-7 w-7 place-items-center rounded-lg ${toneBg}`}>{icon}</div>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <div className="text-[26px] font-semibold tabular-nums tracking-tight text-slate-900 leading-none">{value}</div>
        {suffix && <div className="text-[12.5px] text-slate-500">{suffix}</div>}
      </div>
      {hint && <div className="mt-1 text-[11.5px] text-slate-500">{hint}</div>}
    </div>
  );
}

function FilterTab({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium transition-colors ${
        active ? "brand-gradient text-white shadow-[var(--shadow-glow)]" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`rounded-full px-1.5 text-[10.5px] tabular-nums ${active ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{count}</span>
      )}
    </button>
  );
}

function CallRow({ row, linksEnabled }: { row: Row; linksEnabled: boolean }) {
  const { call, contactName, score, sentiment, followUp, dateIso } = row;
  const t = scoreTone(score);
  const sentimentIcon = sentiment === "positif" ? <Smile className="h-3.5 w-3.5" /> : sentiment === "neutre" ? <Meh className="h-3.5 w-3.5" /> : sentiment === "négatif" ? <Frown className="h-3.5 w-3.5" /> : null;
  const sentimentColor = sentiment === "positif" ? "text-emerald-600" : sentiment === "neutre" ? "text-slate-500" : sentiment === "négatif" ? "text-rose-600" : "text-slate-300";
  const pct = score == null ? 0 : Math.max(4, (score / 5) * 100);

  return (
    <ConditionalLink
      // En démonstration le call n'existe pas en base : un lien mènerait à la
      // vraie page de détail, qui interrogerait Postgres avec un identifiant
      // fictif (erreur 22P02 remontée en erreur serveur).
      href={linksEnabled ? `/feedback/${call.id}` : null}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 hover:bg-slate-50/70 transition-colors"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="relative shrink-0">
          <div className="grid h-10 w-10 place-items-center rounded-xl brand-gradient text-white text-[13px] font-semibold shadow-[var(--shadow-sm)]">
            {contactName.charAt(0).toUpperCase()}
          </div>
          {call.recall_bot_id && (
            <div className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-white ring-1 ring-slate-200">
              <Play className="h-2 w-2 text-[color:var(--violet)] fill-current" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[13.5px] font-medium text-slate-900 group-hover:text-[color:var(--violet)]">{contactName}</div>
            {call.company_name && (
              <>
                <span className="text-slate-300">·</span>
                <div className="truncate text-[12.5px] text-slate-500">{call.company_name}</div>
              </>
            )}
            {call.meeting_stage && (
              <span
                title={MEETING_STAGE_LABELS[call.meeting_stage]}
                className="inline-flex shrink-0 items-center rounded-full border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-1.5 py-px text-[10px] font-semibold text-[color:var(--violet)]"
              >
                {MEETING_STAGE_SHORT_LABELS[call.meeting_stage]}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2.5 text-[11.5px] text-slate-500">
            <span className="tabular-nums">{formatTime(dateIso)}</span>
            {call.duration_seconds !== null && (
              <>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="h-3 w-3" />{formatDuration(call.duration_seconds)}</span>
              </>
            )}
            {call.contact_email && (
              <>
                <span className="text-slate-300">·</span>
                <span className="truncate">{call.contact_email}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden md:flex flex-col items-end w-[110px]">
          <div className={`text-[13px] font-semibold tabular-nums ${t.text}`}>
            {score == null ? "—" : score.toFixed(1)}
            <span className="text-[11px] text-slate-400 font-normal">{score == null ? "" : "/5"}</span>
          </div>
          <div className="mt-1 h-1.5 w-[100px] overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className={`hidden sm:flex items-center gap-1 w-[80px] justify-end ${sentimentColor} text-[12px] font-medium capitalize`}>
          {sentimentIcon}
          <span>{sentiment ?? "—"}</span>
        </div>

        <div className="w-[110px] flex justify-end">
          {followUp === "envoye" && (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Envoyé
            </span>
          )}
          {followUp === "brouillon" && (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-700">
              <FileEdit className="h-3.5 w-3.5" /> Brouillon
            </span>
          )}
          {followUp === "aucun" && (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-400">
              <Mail className="h-3.5 w-3.5" /> À écrire
            </span>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[color:var(--violet)] group-hover:translate-x-0.5 transition-all" />
      </div>
    </ConditionalLink>
  );
}
