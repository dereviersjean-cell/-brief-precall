"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Loader2, Mic } from "lucide-react";
import CompanyLogo from "@/app/components/CompanyLogo";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { companyDomainFromEmail, companyNameFromDomain } from "@/lib/company-domain";
import { deriveNameFromEmail, externalSpeakerNames } from "@/lib/format";
import type { CallWithAnalysis } from "@/lib/db";

// Bibliothèque des calls (demande de Jean du 27/10/2026, sur le modèle de
// Claap) : on ne lit plus le détail d'un call à première vue, on retrouve
// vite n'importe lequel — recherche, période, deal, rang, tri — avec en tête
// les statistiques clés de la personne. Le détail est sur /feedback/[id].
// L'ancienne vue (FeedbackClient) reste pour la démonstration (/demo).

type DealLink = { dealId: string; dealName: string; rank: number };
type Period = "7" | "30" | "90" | "all";
type RankFilter = "all" | "r1" | "suite";
type Sort = "recent" | "best" | "worst";

const PERIODS: { key: Period; label: string }[] = [
  { key: "7", label: "7 jours" },
  { key: "30", label: "30 jours" },
  { key: "90", label: "3 mois" },
  { key: "all", label: "Tout" },
];

const PENDING_WINDOW_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Row = {
  call: CallWithAnalysis;
  title: string;
  contact: string;
  company: string | null;
  dateIso: string;
  score: number | null;
  deal: DealLink | null;
  pending: boolean;
  haystack: string;
};

function fr1(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
}

function scoreTone(v: number): string {
  return v >= 3.5 ? "bg-emerald-50 text-emerald-700" : v >= 2.5 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-slate-900">{value}</p>
      {hint && <p className="text-[12px] text-slate-500">{hint}</p>}
    </div>
  );
}

function CallTile({ row }: { row: Row }) {
  const { call } = row;
  return (
    <Link
      href={`/feedback/${call.id}`}
      className="group flex min-w-0 flex-col rounded-2xl border border-border bg-white p-4 transition-shadow hover:shadow-[0_14px_32px_-18px_rgba(15,23,42,0.35)]"
    >
      <div className="flex items-start gap-3">
        <CompanyLogo
          domain={companyDomainFromEmail(call.contact_email)}
          name={call.prospect_company?.trim() || call.company_name?.trim() || null}
          alt={row.company ?? row.contact}
          className="h-10 w-10 shrink-0 rounded-xl border border-border bg-white object-contain p-0.5"
          fallback={
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--lavender)] text-[16px] font-semibold text-[color:var(--violet)]">
              {(row.company || row.contact).charAt(0).toUpperCase()}
            </span>
          }
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-slate-900 group-hover:text-[color:var(--violet)]">{row.title}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
            {[row.contact, row.company].filter((v, i, a) => v && a.indexOf(v) === i).join(" · ")}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
        {row.deal && (
          <span
            className={`rounded-md px-1.5 py-0.5 font-bold tabular-nums ${row.deal.rank > 1 ? "bg-[color:var(--violet)] text-white" : "bg-slate-100 text-slate-600"}`}
            title={`Deal ${row.deal.dealName}`}
          >
            R{row.deal.rank}
          </span>
        )}
        {row.deal && <span className="max-w-[160px] truncate rounded-md bg-slate-50 px-1.5 py-0.5 text-slate-600">{row.deal.dealName}</span>}
        {row.score !== null && <span className={`rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${scoreTone(row.score)}`}>{fr1(row.score)}/5</span>}
        {row.pending && (
          <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--lavender)] px-1.5 py-0.5 text-[color:var(--violet)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyse en cours
          </span>
        )}
      </div>
      <p className="mt-auto pt-3 text-[12px] tabular-nums text-slate-400">
        {formatDate(row.dateIso)}
        {call.duration_seconds ? ` · ${formatDuration(call.duration_seconds)}` : ""}
      </p>
    </Link>
  );
}

export default function CallLibrary({
  calls,
  dealLinks,
  commercialName,
  people,
  selectedId,
  now,
}: {
  calls: CallWithAnalysis[];
  dealLinks: Record<string, DealLink>;
  commercialName: string | null;
  // Manager : lui et ses commerciaux liés, pour changer de bibliothèque.
  people: { id: string; name: string }[];
  selectedId: string | null;
  // Instant de référence pour les périodes et « analyse en cours ».
  now: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [dealId, setDealId] = useState<string>("all");
  const [rank, setRank] = useState<RankFilter>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const rows: Row[] = useMemo(() => {
    return calls.map((call) => {
      const externals = (call.prospect_contacts ?? []).length > 0 ? call.prospect_contacts! : externalSpeakerNames(call.speaker_names_override, commercialName);
      const contact = externals[0] ?? (call.contact_email ? deriveNameFromEmail(call.contact_email) : null) ?? call.contact_email ?? "Contact inconnu";
      const company = call.prospect_company?.trim() || call.company_name?.trim() || companyNameFromDomain(companyDomainFromEmail(call.contact_email));
      const deal = dealLinks[call.id] ?? null;
      const title = call.meeting_title?.trim() || company || contact;
      const a = call.analysis;
      return {
        call,
        title,
        contact,
        company,
        dateIso: call.started_at ?? call.created_at,
        score: a?.scores?.global_score ?? null,
        deal,
        pending: !a && now - new Date(call.created_at).getTime() < PENDING_WINDOW_MS,
        // Ce qu'on peut chercher : qui, quoi, le deal, et ce que l'analyse
        // a retenu (résumé, points clés, prochaines étapes).
        haystack: normalize(
          [title, contact, company, externals.join(" "), call.contact_email, deal?.dealName, a?.summary, a?.key_points, (a?.next_steps ?? []).join(" ")]
            .filter(Boolean)
            .join(" ")
        ),
      };
    });
  }, [calls, commercialName, dealLinks, now]);

  // La période s'applique aux statistiques et à la liste ; la recherche et
  // les autres filtres à la liste seulement — les chiffres restent ceux de
  // la personne.
  const inPeriod = useMemo(() => {
    if (period === "all") return rows;
    const since = now - Number(period) * DAY_MS;
    return rows.filter((r) => new Date(r.dateIso).getTime() >= since);
  }, [rows, period, now]);

  const stats = useMemo(() => {
    const durations = inPeriod.map((r) => r.call.duration_seconds ?? 0).filter((d) => d > 0);
    const total = durations.reduce((s, d) => s + d, 0);
    const scored = inPeriod.filter((r) => r.score !== null);
    const avg = scored.length ? scored.reduce((s, r) => s + (r.score as number), 0) / scored.length : null;
    const deals = new Set(inPeriod.map((r) => r.deal?.dealId).filter(Boolean));
    return { count: inPeriod.length, total, avgDuration: durations.length ? total / durations.length : null, avg, scoredCount: scored.length, deals: deals.size };
  }, [inPeriod]);

  const dealOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) if (r.deal) map.set(r.deal.dealId, r.deal.dealName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [rows]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    const list = inPeriod.filter(
      (r) =>
        (!q || q.split(/\s+/).every((word) => r.haystack.includes(word))) &&
        (dealId === "all" || r.deal?.dealId === dealId) &&
        (rank === "all" || (rank === "r1" ? r.deal?.rank === 1 : (r.deal?.rank ?? 0) > 1))
    );
    return list.sort((a, b) =>
      sort === "recent"
        ? b.dateIso.localeCompare(a.dateIso)
        : sort === "best"
          ? (b.score ?? -1) - (a.score ?? -1)
          : (a.score ?? 99) - (b.score ?? 99)
    );
  }, [inPeriod, query, dealId, rank, sort]);

  const select = "h-9 rounded-full border border-border bg-white px-3 text-[13px] text-slate-900 outline-none focus:border-[color:var(--violet)]";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader
          eyebrow="Bibliothèque"
          title="Analyse rendez-vous"
          subtitle="Tous les calls enregistrés, analysés et retrouvables en quelques secondes."
          actions={
            people.length > 0 ? (
              <select
                aria-label="Bibliothèque de"
                value={selectedId ?? ""}
                onChange={(e) => router.push(`/feedback?commercial=${encodeURIComponent(e.target.value)}`)}
                className={select}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : undefined
          }
        />

        {calls.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-white px-6 py-12 text-center">
            <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--lavender)]">
              <Mic className="h-5 w-5 text-[color:var(--violet)]" strokeWidth={1.75} />
            </div>
            <p className="text-[15px] font-semibold text-slate-900">Aucun call pour l&apos;instant</p>
            <p className="mt-1 text-[13.5px] text-slate-500">Chaque visio enregistrée par le bot apparaît ici quelques minutes après la fin du call.</p>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                    period === p.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Stat label="Calls" value={String(stats.count)} />
              <Stat label="Temps enregistré" value={stats.total > 0 ? formatDuration(stats.total) : "—"} />
              <Stat label="Durée moyenne" value={stats.avgDuration ? formatDuration(stats.avgDuration) : "—"} />
              <Stat
                label="Score moyen"
                value={stats.avg !== null ? `${fr1(stats.avg)}/5` : "—"}
                hint={`${stats.scoredCount} call${stats.scoredCount > 1 ? "s" : ""} noté${stats.scoredCount > 1 ? "s" : ""}`}
              />
              <Stat label="Deals" value={String(stats.deals)} hint="avec au moins un call" />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border pb-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-full rounded-full border border-border bg-white pl-9 pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--violet)]"
                  placeholder="Contact, entreprise, deal, sujet abordé…"
                />
              </div>
              {dealOptions.length > 0 && (
                <select aria-label="Deal" value={dealId} onChange={(e) => setDealId(e.target.value)} className={select}>
                  <option value="all">Tous les deals</option>
                  {dealOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
              <select aria-label="Rang" value={rank} onChange={(e) => setRank(e.target.value as RankFilter)} className={select}>
                <option value="all">R1, R2, R3…</option>
                <option value="r1">Premiers calls (R1)</option>
                <option value="suite">Suites (R2 et plus)</option>
              </select>
              <select aria-label="Tri" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${select} sm:ml-auto`}>
                <option value="recent">Plus récents</option>
                <option value="best">Meilleur score</option>
                <option value="worst">Score le plus faible</option>
              </select>
            </div>

            <p className="mt-4 text-[12.5px] text-slate-500">
              {visible.length} call{visible.length > 1 ? "s" : ""}
              {visible.length !== inPeriod.length ? ` sur ${inPeriod.length}` : ""}
            </p>
            {visible.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-[13.5px] text-slate-500">
                Aucun call ne correspond. Élargissez la période ou modifiez la recherche.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((r) => (
                  <CallTile key={r.call.id} row={r} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
