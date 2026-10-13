"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MessagesSquare,
  Search,
  Database,
  Users,
  Video,
  Scale,
  AlertTriangle,
  Trophy,
  XCircle,
  HelpCircle,
  ExternalLink,
  Loader2,
  ScanSearch,
} from "lucide-react";
import StatTile from "@/app/dashboard/StatTile";
import HowItWorksCard, { type PipelineStep } from "@/app/settings/_components/HowItWorksCard";
import { formatContactDisplayName } from "@/lib/format";
import type { OrganizationObjectionRow, ObjectionCoverage } from "@/lib/db";

const PIPELINE_STEPS: PipelineStep[] = [
  {
    icon: MessagesSquare,
    title: "Relevées à l'analyse",
    description: "Chaque objection du prospect et la réponse apportée sont extraites du transcript du rendez-vous.",
  },
  {
    icon: ScanSearch,
    title: "Recherche par le sens",
    description: "Les empreintes vectorielles retrouvent un cas proche même formulé avec d'autres mots.",
  },
  {
    icon: Users,
    title: "Partagée par l'équipe",
    description: "La bibliothèque est commune à l'organisation : les réponses des uns servent aux autres.",
  },
];

type SimilarResult = {
  id: string;
  call_id: string;
  contact_email: string | null;
  objection: string;
  response: string;
  created_at: string;
  similarity: number;
  outcome: { outcome: "won" | "lost" } | null;
};

type FilterKey = "all" | "won" | "lost" | "unknown";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "won", label: "Deal gagné" },
  { key: "lost", label: "Deal perdu" },
  { key: "unknown", label: "Issue inconnue" },
];

function OutcomeChip({ outcome }: { outcome: "won" | "lost" | null }) {
  if (outcome === "won") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold bg-[color:var(--success-soft)] text-emerald-700">
        <Trophy className="w-3 h-3" /> Gagné
      </span>
    );
  }
  if (outcome === "lost") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold bg-[color:var(--danger-soft)] text-rose-700">
        <XCircle className="w-3 h-3" /> Perdu
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold bg-slate-100 text-slate-500">
      <HelpCircle className="w-3 h-3" /> Issue inconnue
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function ObjectionCard({
  objection,
  response,
  meta,
  outcome,
  callHref,
  similarity,
}: {
  objection: string;
  response: string;
  meta: string;
  outcome: "won" | "lost" | null;
  callHref: string | null;
  similarity?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[color:var(--lavender)] text-[color:var(--violet)]">
          <MessagesSquare className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-snug text-slate-900">« {objection} »</p>
          <div className="mt-2.5">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Réponse apportée</p>
            <p className="text-[13.5px] leading-relaxed text-slate-600">{response}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
            <OutcomeChip outcome={outcome} />
            {typeof similarity === "number" && (
              <span className="inline-flex items-center rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)] tabular-nums">
                {Math.round(similarity * 100)}% similaire
              </span>
            )}
            <span className="min-w-0 truncate">{meta}</span>
            {callHref && (
              <Link
                href={callHref}
                className="inline-flex items-center gap-1 text-[color:var(--violet)] hover:underline font-medium shrink-0"
              >
                Voir le call <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ObjectionsClient({
  objections,
  coverage,
  currentUserId,
  isManager,
}: {
  objections: OrganizationObjectionRow[];
  coverage: ObjectionCoverage;
  currentUserId: string;
  isManager: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SimilarResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const contactsCount = useMemo(
    () => new Set(objections.map((o) => o.contactEmail).filter(Boolean)).size,
    [objections]
  );
  const knownOutcomeCount = useMemo(() => objections.filter((o) => o.outcome !== null).length, [objections]);
  const knownOutcomeRate = objections.length > 0 ? Math.round((knownOutcomeCount / objections.length) * 100) : 0;
  const uncoveredCalls = Math.max(0, coverage.analyzedCalls - coverage.callsWithObjections);
  const unknownOutcomeCount = objections.length - knownOutcomeCount;

  const filtered = useMemo(() => {
    if (filter === "all") return objections;
    if (filter === "unknown") return objections.filter((o) => o.outcome === null);
    return objections.filter((o) => o.outcome === filter);
  }, [objections, filter]);

  function callHref(ownerId: string | null, callId: string): string | null {
    if (ownerId === currentUserId) return `/feedback/${callId}`;
    if (isManager && ownerId) return `/team/${ownerId}/calls/${callId}`;
    return null;
  }

  async function runSearch() {
    const text = query.trim();
    if (!text) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/objections/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Recherche indisponible.");
      setSearchResults((data as { similar: SimilarResult[] }).similar);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Recherche indisponible.");
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setSearchResults(null);
    setSearchError(null);
  }

  const ownerById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const o of objections) map.set(o.id, o.callOwnerId);
    return map;
  }, [objections]);

  return (
    <div>
      <HowItWorksCard title="Objections & réponses" steps={PIPELINE_STEPS}>
        Cette bibliothèque se remplit toute seule : à l&apos;analyse de chaque rendez-vous, les objections soulevées
        par le prospect et la réponse réellement apportée sont relevées, puis converties en{" "}
        <span className="font-medium text-slate-900">empreinte vectorielle</span> (Voyage AI), le même mécanisme que
        vos références clients. Chercher « c&apos;est trop cher » remonte donc aussi « votre budget dépasse ce
        qu&apos;on avait prévu » : c&apos;est le sens qui est comparé, pas les mots. Elle est{" "}
        <span className="font-medium text-slate-900">commune à toute l&apos;organisation</span>, et c&apos;est
        délibéré — un commercial qui débute dispose immédiatement des réponses que l&apos;équipe a déjà éprouvées,
        avec l&apos;issue du deal quand elle est connue.
      </HowItWorksCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatTile index={0} accent="indigo" label="Objections" value={objections.length} icon={<Database className="w-3.5 h-3.5" />} />
        <StatTile index={1} accent="violet" label="Contacts concernés" value={contactsCount} icon={<Users className="w-3.5 h-3.5" />} />
        <StatTile
          index={2}
          accent="emerald"
          label="Calls couverts"
          value={coverage.callsWithObjections}
          suffix={` / ${coverage.analyzedCalls}`}
          icon={<Video className="w-3.5 h-3.5" />}
        />
        <StatTile index={3} accent="amber" label="Issue connue" value={knownOutcomeRate} suffix="%" icon={<Scale className="w-3.5 h-3.5" />} />
      </div>

      {(uncoveredCalls > 0 || unknownOutcomeCount > 0) && (
        <div className="mt-4 space-y-2">
          {uncoveredCalls > 0 && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-[color:var(--warning-soft)] px-4 py-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
              <p className="text-[13px] leading-relaxed text-amber-800">
                {uncoveredCalls} call{uncoveredCalls > 1 ? "s" : ""} analysé{uncoveredCalls > 1 ? "s" : ""}{" "}
                sans objection dans la bibliothèque — soit aucune objection n&apos;y a été soulevée, soit le call date
                d&apos;avant la bibliothèque et n&apos;a pas encore été réindexé.
              </p>
            </div>
          )}
          {unknownOutcomeCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-[color:var(--lavender)] px-4 py-3">
              <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--violet)]" />
              <p className="text-[13px] leading-relaxed text-slate-600">
                {unknownOutcomeCount} objection{unknownOutcomeCount > 1 ? "s" : ""}{" "}
                sans issue connue — le
                gagné/perdu vient des devis Brief acceptés/refusés et des deals fermés dans votre CRM connecté. Plus
                l&apos;issue est connue, plus la bibliothèque dit quelles réponses gagnent.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-[240px] sm:max-w-md sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Décrivez une objection (ex. « c'est trop cher »)…"
            className="h-9 w-full rounded-xl border border-border bg-white pl-9 pr-3.5 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)]"
          />
        </div>
        <button
          onClick={runSearch}
          disabled={searching || !query.trim()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Recherche sémantique
        </button>
        {searchResults !== null && (
          <button
            onClick={clearSearch}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Réinitialiser
          </button>
        )}
        {searchResults === null && (
          <div className="no-scrollbar inline-flex max-w-full overflow-x-auto rounded-full bg-slate-100 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-200 ${
                  filter === f.key ? "bg-white text-slate-900 shadow-[0_1px_3px_oklch(0.19_0.02_266/0.12)]" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {searchError && <p className="mt-3 rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-rose-700">{searchError}</p>}

      <div className="mt-5 space-y-3">
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-[13.5px] text-slate-500">
              Aucune objection similaire trouvée dans la bibliothèque.
            </div>
          ) : (
            searchResults.map((s) => (
              <ObjectionCard
                key={s.id}
                objection={s.objection}
                response={s.response}
                outcome={s.outcome?.outcome ?? null}
                similarity={s.similarity}
                meta={`${s.contact_email ? formatContactDisplayName(null, s.contact_email) : "Contact inconnu"} · ${formatDate(s.created_at)}`}
                callHref={callHref(ownerById.get(s.id) ?? null, s.call_id)}
              />
            ))
          )
        ) : objections.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white px-6 py-12 text-center">
            <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[color:var(--lavender)] text-[color:var(--violet)]">
              <MessagesSquare className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="text-[15px] font-semibold text-slate-900">La bibliothèque se remplit toute seule</p>
            <p className="mx-auto mt-1 max-w-md text-[13.5px] text-slate-500">
              À chaque call analysé, Brief extrait les objections soulevées et la réponse apportée. Toute
              l&apos;équipe en bénéficie dès le premier call enregistré.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-10 text-center text-[13.5px] text-slate-500">
            Aucune objection pour ce filtre.
          </div>
        ) : (
          filtered.map((o) => (
            <ObjectionCard
              key={o.id}
              objection={o.objection}
              response={o.response}
              outcome={o.outcome}
              meta={`${formatContactDisplayName(o.companyName, o.contactEmail)} · ${formatDate(o.createdAt)}`}
              callHref={callHref(o.callOwnerId, o.callId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
