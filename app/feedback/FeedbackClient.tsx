"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConditionalLink from "@/app/components/ui/ConditionalLink";
import CompanyLogo from "@/app/components/CompanyLogo";
import { companyDomainFromEmail, companyNameFromDomain } from "@/lib/company-domain";
import {
  Search,
  Mic,
  Mail,
  Sparkles,
  TrendingUp,
  Radio,
  ChevronRight,
  Clock,
  Check,
  Send,
  PenLine,
  ArrowRight,
  Loader2,
  MessageSquareWarning,
} from "lucide-react";
import type { CallWithAnalysis } from "@/lib/db";
import { MEETING_STAGES, MEETING_STAGE_SHORT_LABELS, MEETING_STAGE_LABELS, type MeetingStage } from "@/lib/meeting-stage";
import { useModules } from "@/app/components/ModulesProvider";
import { deriveNameFromEmail, externalSpeakerNames } from "@/lib/format";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Button } from "@/app/components/ui/ui-bits";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Calculs de calendrier en heure de Paris, au serveur (UTC sur Vercel) comme
// au navigateur : sans fuseau fixé, les deux rendus ne tomberaient pas sur la
// même heure ni, autour de minuit, sur le même jour.
const TZ = "Europe/Paris";
const PARIS_YMD = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

// Numéro du jour (calendrier parisien) depuis le 1er janvier 1970.
function parisDay(d: Date): { n: number; year: number; month: number } {
  const [y, m, day] = PARIS_YMD.format(d).split("-").map(Number);
  return { n: Math.round(Date.UTC(y, m - 1, day) / 86_400_000), year: y, month: m };
}

// Intervalles relatifs, comme les outils d'enregistrement de calls (Attention,
// Claap) : on se repère par « hier » ou « la semaine dernière » bien plus vite
// que par une date. Au-delà, le mois.
function dateGroupLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const day = parisDay(d);
  const today = parisDay(now);
  // Le 1er janvier 1970 était un jeudi : +3 donne 0 pour un lundi.
  const monday = today.n - ((today.n + 3) % 7);
  if (day.n >= today.n) return "Aujourd'hui";
  if (day.n === today.n - 1) return "Hier";
  if (day.n >= monday) return "Plus tôt cette semaine";
  if (day.n >= monday - 7) return "La semaine dernière";
  if (day.year === today.year && day.month === today.month)
    return `Plus tôt en ${d.toLocaleDateString("fr-FR", { month: "long", timeZone: TZ })}`;
  const month = d.toLocaleDateString("fr-FR", {
    month: "long",
    timeZone: TZ,
    ...(day.year !== today.year ? { year: "numeric" } : {}),
  });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function scoreTone(v: number | null) {
  if (v == null) return { ring: "stroke-slate-200", text: "text-slate-400" };
  if (v >= 3.5) return { ring: "stroke-[color:var(--success)]", text: "text-emerald-700" };
  if (v >= 2) return { ring: "stroke-[color:var(--warning)]", text: "text-amber-700" };
  return { ring: "stroke-[color:var(--danger)]", text: "text-rose-700" };
}

function fr1(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

// Un call sans analyse depuis moins de 20 minutes est en cours de traitement :
// le webhook enregistre le call AVANT de l'analyser. Plus vieux, l'analyse
// n'arrivera plus (call sans parole, échec) — il reste dans la liste.
const PENDING_WINDOW_MS = 20 * 60 * 1000;

type FollowUpState = "envoye" | "brouillon" | "aucun";

// Enriched once per render rather than recomputed in every filter/group pass.
type Row = {
  call: CallWithAnalysis;
  contactName: string;
  // Déduite du domaine de l'adresse quand le call n'en porte aucune.
  company: string | null;
  // Toutes les personnes d'en face relevées en visio. La première est
  // affichée, les autres comptées — on ne sait pas désigner l'interlocuteur
  // principal, donc on ne prétend pas le faire.
  externals: string[];
  score: number | null;
  followUp: FollowUpState;
  dateIso: string;
  dateGroup: string;
  pending: boolean;
};

type FilterKey = "all" | "todo" | "sent" | "low" | MeetingStage;

export default function FeedbackClient({
  calls,
  // Null en démonstration : ces calls n'ont pas de propriétaire réel.
  commercialName = null,
  // false sur /demo/feedback : ces calls n'existent pas en base.
  linksEnabled = true,
}: {
  calls: CallWithAnalysis[];
  commercialName?: string | null;
  linksEnabled?: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isEnabled: isModuleEnabled } = useModules();
  // Relance et objections n'existent que si leur module est ouvert (parcours
  // client, lib/modules.ts) — même règle que sur la page d'un call.
  const followUpEnabled = isModuleEnabled("follow_up");
  const objectionsEnabled = isModuleEnabled("objections");

  const allRows: Row[] = useMemo(() => {
    const now = new Date();
    return calls.map((call) => {
        const dateIso = call.started_at ?? call.created_at;
        // Trois sources, de la mieux informée à la plus pauvre.
        //
        // 1. L'identité tirée de l'ANALYSE (migration 015) : elle seule sait
        //    qui, parmi les personnes présentes, est du côté prospect — sur un
        //    call mené par un autre commercial que le titulaire du compte, le
        //    filtre par nom du propriétaire ne suffit pas. Elle donne aussi
        //    l'entreprise réellement rencontrée (« Vasco/Gamma ») là où le call
        //    porte celle du rendez-vous (« Théa »).
        // 2. Les noms relevés en visio, moins le commercial connu.
        // 3. Le nom déduit de l'adresse — « Dereviersjean », faute de mieux.
        const identified = call.prospect_contacts ?? [];
        const externals =
          identified.length > 0
            ? identified
            : externalSpeakerNames(call.speaker_names_override, commercialName);
        return {
          call,
          contactName:
            externals[0] ??
            (call.contact_email ? deriveNameFromEmail(call.contact_email) : null) ??
            call.contact_email ??
            "Contact inconnu",
          externals,
          // prospect_company passe DEVANT company_name : contrairement à
          // l'adresse saisie du bug #38, company_name n'est pas une donnée de
          // première main — c'est le nom deviné au rendez-vous, quand
          // l'analyse, elle, a lu la conversation.
          company:
            call.prospect_company?.trim() ||
            call.company_name?.trim() ||
            companyNameFromDomain(companyDomainFromEmail(call.contact_email)),
          score: call.analysis?.scores?.global_score ?? null,
          followUp: call.follow_up_sent_at ? "envoye" : call.follow_up_email ? "brouillon" : "aucun",
          dateIso,
          dateGroup: dateGroupLabel(dateIso, now),
          pending: !call.analysis && now.getTime() - new Date(call.created_at).getTime() < PENDING_WINDOW_MS,
        };
      });
  }, [calls, commercialName]);

  const pendingRows = useMemo(() => allRows.filter((r) => r.pending), [allRows]);
  const rows = useMemo(() => allRows.filter((r) => !r.pending), [allRows]);

  // Tant qu'une analyse est en cours, la page se relit toute seule : sinon le
  // bandeau promet un résultat qui n'apparaît qu'en rechargeant à la main.
  const hasPending = pendingRows.length > 0;
  useEffect(() => {
    if (!hasPending) return;
    const t = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(t);
  }, [hasPending, router]);

  const todoCount = rows.filter((r) => r.followUp === "aucun").length;
  const sentCount = rows.filter((r) => r.followUp === "envoye").length;
  const draftCount = rows.filter((r) => r.followUp === "brouillon").length;
  const lowCount = rows.filter((r) => r.score !== null && r.score < 3).length;
  const scored = rows.filter((r) => r.score !== null);
  const avgScore = scored.length ? scored.reduce((s, r) => s + (r.score as number), 0) / scored.length : null;
  // Une vue par étape réellement présente : un onglet « R3 » vide n'aide pas.
  const stages = MEETING_STAGES.filter((st) => rows.some((r) => r.call.meeting_stage === st));

  const views: { key: FilterKey; label: string; count: number; alert?: boolean }[] = [
    { key: "all", label: "Tous mes calls", count: rows.length },
    ...(followUpEnabled ? [{ key: "todo" as const, label: "À traiter", count: todoCount, alert: true }] : []),
    ...stages.map((st) => ({
      key: st,
      label: MEETING_STAGE_SHORT_LABELS[st],
      count: rows.filter((r) => r.call.meeting_stage === st).length,
    })),
    { key: "low", label: "Score sous 3", count: lowCount },
    ...(followUpEnabled ? [{ key: "sent" as const, label: "Relances envoyées", count: sentCount }] : []),
  ];
  // Un module refermé pendant qu'on regardait sa vue : retour à « Tous ».
  const activeFilter: FilterKey = views.some((v) => v.key === filter) ? filter : "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeFilter === "todo" && r.followUp !== "aucun") return false;
      if (activeFilter === "sent" && r.followUp !== "envoye") return false;
      if (activeFilter === "low" && !(r.score !== null && r.score < 3)) return false;
      if ((activeFilter === "r1" || activeFilter === "r2" || activeFilter === "r3") && r.call.meeting_stage !== activeFilter)
        return false;
      if (q) {
        const a = r.call.analysis;
        const haystack = [
          r.contactName,
          r.call.contact_email,
          r.company,
          a?.summary,
          ...(a?.next_steps ?? []),
          ...(objectionsEnabled ? (a?.objections ?? []).map((o) => o.objection) : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, activeFilter, query, objectionsEnabled]);

  const grouped = useMemo(() => {
    const g: Record<string, Row[]> = {};
    for (const r of filtered) (g[r.dateGroup] ??= []).push(r);
    return Object.entries(g);
  }, [filtered]);

  // L'aperçu suit le survol (grand écran) : le clic, lui, ouvre toujours
  // l'analyse — rien ne change pour qui veut simplement entrer dans un call.
  const selected = filtered.find((r) => r.call.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div data-tour="feedback-content" className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10">
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
          <div className="mt-8 rounded-2xl border border-border bg-white px-6 py-12 text-center">
            <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--lavender)]">
              <Mic className="h-5 w-5 text-[color:var(--violet)]" strokeWidth={1.75} />
            </div>
            <p className="text-[15px] font-semibold text-slate-900">Aucun appel analysé pour l&apos;instant</p>
            <p className="mt-1 text-[13.5px] text-slate-500">
              Vos analyses apparaîtront ici après chaque appel enregistré via Recall.AI.
            </p>
          </div>
        ) : (
          <>
            {/* KPI strip */}
            {/* Trois indicateurs depuis le retrait du sentiment : en deux
                colonnes le troisième resterait seul sur sa ligne. */}
            <div className={`mt-8 grid grid-cols-1 gap-3 ${followUpEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <KpiPill label="Calls analysés" value={rows.length.toString()} hint="au total" icon={<Mic className="h-4 w-4" />} />
              <KpiPill
                label="Score moyen"
                value={avgScore !== null ? fr1(avgScore) : "—"}
                suffix={avgScore !== null ? "/5" : undefined}
                hint={`${scored.length} call${scored.length !== 1 ? "s" : ""} noté${scored.length !== 1 ? "s" : ""}`}
                tone={avgScore === null ? "neutral" : avgScore >= 3.5 ? "success" : avgScore >= 2 ? "warning" : "danger"}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              {followUpEnabled && (
                <KpiPill
                  label="Suivi"
                  value={sentCount.toString()}
                  suffix=" envoyés"
                  hint={`${draftCount} brouillon${draftCount !== 1 ? "s" : ""} · ${todoCount} à traiter`}
                  tone="info"
                  icon={<Mail className="h-4 w-4" />}
                />
              )}
            </div>

            {/* Vues + recherche */}
            <div className="mt-7 flex flex-wrap items-center gap-3 border-b border-border pb-3">
              <div className="no-scrollbar -mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1">
                {views.map((v) => {
                  const on = activeFilter === v.key;
                  return (
                    <button
                      key={v.key}
                      onClick={() => setFilter(v.key)}
                      className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                        on ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {v.label}
                      {v.alert && v.count > 0 ? (
                        <span className="rounded-full bg-[color:var(--warning)] px-1.5 text-[11px] font-semibold tabular-nums text-white">{v.count}</span>
                      ) : (
                        <span className={`text-[11.5px] tabular-nums ${on ? "text-white/60" : "text-slate-400"}`}>{v.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="relative w-full sm:ml-auto sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-full rounded-full border border-border bg-white pl-9 pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)]"
                  placeholder="Contact, entreprise, sujet…"
                />
              </div>
            </div>

            {/* En cours d'analyse */}
            {pendingRows.length > 0 && (
              <div className="mt-5 space-y-2">
                {pendingRows.map((r) => (
                  <div
                    key={r.call.id}
                    className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-white px-4 py-3 text-[13.5px] text-slate-600"
                  >
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[color:var(--violet)]" />
                    <span className="min-w-0">
                      <span className="font-semibold text-slate-900">{r.company ?? r.contactName}</span> · analyse en cours, elle
                      apparaîtra ici dans quelques minutes.
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0 space-y-7">
                {grouped.map(([group, groupRows], groupIndex) => {
                  const groupScored = groupRows.filter((r) => r.score !== null);
                  const groupAvg = groupScored.length
                    ? groupScored.reduce((s, r) => s + (r.score as number), 0) / groupScored.length
                    : null;
                  return (
                    <section key={group}>
                      {/* Collé sous la TopBar (h-14), z-index en dessous d'elle. */}
                      <div className="sticky top-14 z-[5] -mx-1 flex items-baseline gap-3 bg-[color:var(--background)]/95 px-1 py-2 backdrop-blur">
                        <h2 className="text-[15px] font-semibold text-slate-900">{group}</h2>
                        <span className="text-[12.5px] text-slate-500">
                          {groupRows.length} call{groupRows.length > 1 ? "s" : ""}
                          {groupAvg !== null && (
                            <>
                              {" "}· moyenne{" "}
                              <span className={`font-semibold tabular-nums ${scoreTone(groupAvg).text}`}>{fr1(groupAvg)}</span>
                            </>
                          )}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                      <ol className="relative mt-2 space-y-3 border-l-2 border-border pl-5 sm:pl-6">
                        {groupRows.map((r, rowIndex) => (
                          <CallCard
                            key={r.call.id}
                            row={r}
                            selected={selected?.call.id === r.call.id}
                            onPreview={() => setSelectedId(r.call.id)}
                            linksEnabled={linksEnabled}
                            followUpEnabled={followUpEnabled}
                            objectionsEnabled={objectionsEnabled}
                            showDay={group !== "Aujourd'hui" && group !== "Hier"}
                            tourAnchor={groupIndex === 0 && rowIndex === 0}
                          />
                        ))}
                      </ol>
                    </section>
                  );
                })}

                {grouped.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center">
                    <div className="text-[14px] font-semibold text-slate-900">Aucun call ne correspond à cette vue.</div>
                    <div className="mt-1 text-[12.5px] text-slate-500">Essayez « Tous mes calls » ou modifiez votre recherche.</div>
                  </div>
                )}
              </div>

              <aside className="hidden xl:block">
                {selected && (
                  <PreviewPanel row={selected} linksEnabled={linksEnabled} followUpEnabled={followUpEnabled} />
                )}
              </aside>
            </div>

            <div className="mt-8 flex items-start gap-2.5 rounded-2xl bg-[color:var(--lavender)] px-4 py-3 text-[12.5px] leading-relaxed text-slate-600">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--violet)]" />
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
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">{label}</div>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${toneBg}`}>{icon}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <div className="text-[30px] font-semibold tabular-nums tracking-tight text-slate-900 leading-none">{value}</div>
        {suffix && <div className="text-[14px] font-medium text-slate-400">{suffix}</div>}
      </div>
      {hint && <div className="mt-2 text-[12px] text-slate-500">{hint}</div>}
    </div>
  );
}

// Anneau de note : la note se lit au centre, la couleur et le remplissage
// disent d'un coup d'œil où se situe le call sur 5.
function ScoreRing({ score, size = 56 }: { score: number | null; size?: number }) {
  const t = scoreTone(score);
  const c = 2 * Math.PI * 22;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 50 50" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="25" cy="25" r="22" fill="none" strokeWidth="4" className="stroke-slate-100" />
        {score !== null && (
          <circle
            cx="25"
            cy="25"
            r="22"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            className={t.ring}
            strokeDasharray={`${(Math.max(0, Math.min(5, score)) / 5) * c} ${c}`}
          />
        )}
      </svg>
      <span
        className={`font-semibold tabular-nums ${score === null ? "text-slate-400" : "text-slate-900"}`}
        style={{ fontSize: size * 0.3 }}
        title={score === null ? "Pas de note pour ce call" : `${fr1(score)} / 5`}
      >
        {score === null ? "—" : fr1(score)}
      </span>
    </span>
  );
}

function Logo({ row, big = false }: { row: Row; big?: boolean }) {
  const { call, contactName, company } = row;
  const box = big ? "h-10 w-10 rounded-xl" : "h-[22px] w-[22px] rounded-md";
  return (
    // Logo de l'entreprise du contact, trouvé par le serveur à partir de son
    // domaine et du nom de l'entreprise (app/api/company-logo, mis en
    // cache). Repli sur l'initiale quand rien n'est trouvé.
    <CompanyLogo
      domain={companyDomainFromEmail(call.contact_email)}
      name={call.prospect_company?.trim() || call.company_name?.trim() || null}
      alt={company ?? contactName}
      className={`${box} shrink-0 border border-border bg-white object-contain p-0.5`}
      fallback={
        <span
          className={`${box} grid shrink-0 place-items-center bg-[color:var(--lavender)] font-semibold text-[color:var(--violet)] ${
            big ? "text-[17px]" : "text-[11px]"
          }`}
        >
          {(company || contactName).charAt(0).toUpperCase()}
        </span>
      }
    />
  );
}

const FOLLOW_PILL: Record<FollowUpState, { label: string; cls: string }> = {
  envoye: { label: "Relance · envoyée", cls: "bg-[color:var(--success-soft)] text-emerald-700" },
  brouillon: { label: "Relance · brouillon prêt", cls: "bg-[color:var(--warning-soft)] text-amber-700" },
  aucun: { label: "Relance · à écrire", cls: "bg-slate-100 text-slate-500" },
};

function FollowAction({ row, linksEnabled, size = "sm" }: { row: Row; linksEnabled: boolean; size?: "sm" | "md" }) {
  const href = linksEnabled ? `/feedback/${row.call.id}?tab=email` : null;
  const h = size === "md" ? "h-9 px-4 text-[13px]" : "h-8 px-3 text-[12.5px]";
  if (row.followUp === "envoye") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" /> Relance envoyée
      </span>
    );
  }
  if (row.followUp === "brouillon") {
    return (
      <ConditionalLink
        href={href}
        className={`relative z-[1] inline-flex items-center gap-1.5 rounded-full bg-[color:var(--primary)] font-semibold text-white transition-[filter] hover:brightness-110 ${h}`}
      >
        <Send className="h-3.5 w-3.5" /> Relire et envoyer
      </ConditionalLink>
    );
  }
  return (
    <ConditionalLink
      href={href}
      className={`relative z-[1] inline-flex items-center gap-1.5 rounded-full border border-border bg-white font-semibold text-slate-700 transition-colors hover:border-slate-300 ${h}`}
    >
      <PenLine className="h-3.5 w-3.5" /> Rédiger la relance
    </ConditionalLink>
  );
}

function formatTime(iso: string, withDay: boolean): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  if (!withDay) return time;
  return `${d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: TZ })} · ${time}`;
}

function CallCard({
  row,
  selected,
  onPreview,
  linksEnabled,
  followUpEnabled,
  objectionsEnabled,
  showDay,
  // La visite guidée met en évidence la première carte, pas la liste entière :
  // un bloc plus haut que l'écran force la bulle à se poser par-dessus.
  tourAnchor = false,
}: {
  row: Row;
  selected: boolean;
  onPreview: () => void;
  linksEnabled: boolean;
  followUpEnabled: boolean;
  objectionsEnabled: boolean;
  showDay: boolean;
  tourAnchor?: boolean;
}) {
  const { call, contactName, company, externals, score, followUp } = row;
  const a = call.analysis;
  const objection = a?.objections?.[0]?.objection?.trim() || null;
  const nextStep = a?.next_steps?.[0]?.trim() || null;

  return (
    <li className="relative" onMouseEnter={onPreview} onFocus={onPreview}>
      <span
        className={`absolute -left-[29px] top-6 h-3.5 w-3.5 rounded-full border-[3px] border-[color:var(--background)] ring-1 ring-border sm:-left-[33px] ${
          selected ? "xl:bg-[color:var(--primary)] bg-slate-300" : "bg-slate-300"
        }`}
      />
      <div
        data-tour={tourAnchor ? "feedback-list" : undefined}
        className={`group relative rounded-2xl border bg-white p-4 transition-colors sm:p-5 ${
          selected
            ? "border-border hover:border-slate-300 xl:border-[color:var(--primary)] xl:ring-2 xl:ring-[color:var(--primary)]/10"
            : "border-border hover:border-slate-300"
        }`}
      >
        {/* Toute la carte ouvre l'analyse (lien étiré) ; le bouton de relance,
            posé au-dessus, mène directement à l'onglet Email de suivi. Deux
            liens imbriqués seraient du HTML invalide. En démonstration, la
            carte reste inerte (ConditionalLink). */}
        {linksEnabled && (
          <Link
            href={`/feedback/${call.id}`}
            aria-label={`Ouvrir l'analyse — ${company ?? contactName}`}
            className="absolute inset-0 rounded-2xl"
          />
        )}
        <div className="flex items-start gap-3.5 sm:gap-4">
          <ScoreRing score={score} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Logo row={row} />
              <span className="min-w-0 truncate text-[15.5px] font-semibold text-slate-900">{company ?? contactName}</span>
              {call.meeting_stage && (
                <span
                  title={MEETING_STAGE_LABELS[call.meeting_stage]}
                  className="rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--violet)]"
                >
                  {MEETING_STAGE_SHORT_LABELS[call.meeting_stage]}
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-slate-500">
              {company && (
                <>
                  <span className="truncate">{contactName}</span>
                  {externals.length > 1 && (
                    <span
                      // Le survol nomme les autres : un « +2 » muet obligerait à
                      // ouvrir le call pour savoir qui était là.
                      title={`${externals.length} personnes en face : ${externals.join(", ")}`}
                      className="text-[11.5px] font-medium tabular-nums text-slate-400"
                    >
                      +{externals.length - 1}
                    </span>
                  )}
                  <span className="text-slate-300">·</span>
                </>
              )}
              <span className="tabular-nums">{formatTime(row.dateIso, showDay)}</span>
              <span className="text-slate-300">·</span>
              {call.duration_seconds !== null ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="h-3 w-3" /> {formatDuration(call.duration_seconds)}
                </span>
              ) : (
                // Dit pourquoi la valeur manque plutôt que de la laisser vide :
                // une durée absente veut dire que l'enregistrement n'a rien duré.
                <span className="text-slate-400">durée non enregistrée</span>
              )}
            </div>
            {a?.summary ? (
              <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-slate-700">{a.summary}</p>
            ) : (
              <p className="mt-2 text-[13.5px] text-slate-400">Pas d&apos;analyse pour ce call.</p>
            )}
            {a && (
              <div className="mt-3 flex flex-wrap gap-2">
                {objectionsEnabled && (
                  <span
                    title={objection ?? undefined}
                    className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] ${
                      objection ? "bg-[color:var(--warning-soft)] text-amber-900" : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    <MessageSquareWarning className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{objection ?? "Aucune objection détectée"}</span>
                  </span>
                )}
                <span
                  title={nextStep ?? undefined}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] ${
                    nextStep ? "bg-[color:var(--lavender)] text-slate-800" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{nextStep ?? "Pas de prochaine étape fixée"}</span>
                </span>
              </div>
            )}
          </div>
          <ChevronRight className="mt-1 hidden h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500 sm:block" />
        </div>
        {followUpEnabled && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${FOLLOW_PILL[followUp].cls}`}>
              {FOLLOW_PILL[followUp].label}
            </span>
            <FollowAction row={row} linksEnabled={linksEnabled} />
          </div>
        )}
      </div>
    </li>
  );
}

const SENTIMENT_PILL: Record<string, string> = {
  positif: "bg-[color:var(--success-soft)] text-emerald-700",
  neutre: "bg-slate-100 text-slate-600",
  négatif: "bg-[color:var(--danger-soft)] text-rose-700",
};

function PreviewPanel({ row, linksEnabled, followUpEnabled }: { row: Row; linksEnabled: boolean; followUpEnabled: boolean }) {
  const { call, contactName, company, score, followUp } = row;
  const a = call.analysis;
  const steps = (a?.next_steps ?? []).filter((s) => s.trim()).slice(0, 3);
  const sentiment = a?.sentiment?.trim().toLowerCase() ?? null;
  const t = scoreTone(score);
  const email = call.follow_up_email;

  return (
    <div className="sticky top-20 overflow-hidden rounded-[24px] border border-border bg-white">
      <div className="border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Aperçu</div>
      <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-5 py-5">
        <div className="flex items-center gap-3">
          <Logo row={row} big />
          <div className="min-w-0">
            <div className="truncate text-[17px] font-semibold text-slate-900">{company ?? contactName}</div>
            {company && <div className="truncate text-[13px] text-slate-500">{contactName}</div>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-slate-500">
          {call.meeting_stage && (
            <span className="rounded-full bg-[color:var(--lavender)] px-2 py-0.5 font-semibold text-[color:var(--violet)]">
              {MEETING_STAGE_SHORT_LABELS[call.meeting_stage]}
            </span>
          )}
          <span className="tabular-nums">{formatTime(row.dateIso, true)}</span>
          {call.duration_seconds !== null && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="h-3.5 w-3.5" /> {formatDuration(call.duration_seconds)}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className={`text-[40px] font-semibold leading-none tabular-nums ${t.text}`}>{score === null ? "—" : fr1(score)}</span>
          {score !== null && <span className="text-slate-400">/5</span>}
          {sentiment && (
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ${SENTIMENT_PILL[sentiment] ?? SENTIMENT_PILL.neutre}`}>
              {sentiment}
            </span>
          )}
        </div>

        {a?.summary && <p className="mt-4 text-[14px] leading-relaxed text-slate-700">{a.summary}</p>}

        {steps.length > 0 && (
          <div className="mt-4 rounded-2xl bg-[color:var(--lavender)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--violet)]">Prochaines étapes</div>
            <ul className="mt-2 space-y-1.5 text-[13.5px] text-slate-800">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[color:var(--violet)]">→</span> <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {followUpEnabled && (
          <div className="mt-4 rounded-2xl border border-border p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {followUp === "envoye" ? "Relance envoyée" : followUp === "brouillon" ? "Relance prête" : "Relance"}
            </div>
            {email?.subject ? (
              <>
                <div className="mt-1.5 text-[13.5px] font-semibold text-slate-900">{email.subject}</div>
                {email.body && <p className="mt-1 line-clamp-3 text-[13px] text-slate-600">{email.body.replace(/\s+/g, " ")}</p>}
              </>
            ) : (
              <p className="mt-1.5 text-[13px] text-slate-500">Pas encore d&apos;email de suivi pour ce call.</p>
            )}
            {followUp === "envoye" && call.follow_up_sent_at ? (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Envoyée le{" "}
                {new Date(call.follow_up_sent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: TZ })}
              </div>
            ) : (
              <div className="mt-3">
                <FollowAction row={row} linksEnabled={linksEnabled} size="md" />
              </div>
            )}
          </div>
        )}

        <ConditionalLink
          href={linksEnabled ? `/feedback/${call.id}` : null}
          className="mt-4 flex h-10 items-center justify-center gap-2 rounded-full border border-border text-[13.5px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          Ouvrir l&apos;analyse complète <ArrowRight className="h-4 w-4" />
        </ConditionalLink>
      </div>
    </div>
  );
}
