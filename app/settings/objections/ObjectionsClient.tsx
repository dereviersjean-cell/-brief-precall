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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--success-soft)] text-emerald-700">
        <Trophy className="w-3 h-3" /> Gagné
      </span>
    );
  }
  if (outcome === "lost") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--danger-soft)] text-rose-700">
        <XCircle className="w-3 h-3" /> Perdu
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
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
    <div className="bg-white rounded-2xl border border-border shadow-[var(--shadow-sm)] p-5 hover:shadow-[var(--shadow-md)] hover:border-[color:var(--lavender-strong)] transition-all">
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-[color:var(--lavender)] text-[color:var(--violet)] flex items-center justify-center shrink-0 mt-0.5">
          <MessagesSquare className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 leading-snug">« {objection} »</p>
          <div className="mt-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Réponse apportée</p>
            <p className="text-sm text-slate-600 leading-relaxed">{response}</p>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-400">
            <OutcomeChip outcome={outcome} />
            {typeof similarity === "number" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--lavender)] text-[color:var(--violet)]">
                {Math.round(similarity * 100)}% similaire
              </span>
            )}
            <span className="truncate">{meta}</span>
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
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </span>
              <p className="text-sm text-amber-800">
                {uncoveredCalls} call{uncoveredCalls > 1 ? "s" : ""} analysé{uncoveredCalls > 1 ? "s" : ""}{" "}
                sans objection dans la bibliothèque — soit aucune objection n&apos;y a été soulevée, soit le call date
                d&apos;avant la bibliothèque et n&apos;a pas encore été réindexé.
              </p>
            </div>
          )}
          {unknownOutcomeCount > 0 && (
            <div className="flex items-start gap-3 bg-[color:var(--lavender)] border border-[color:var(--lavender-strong)] rounded-2xl px-4 py-3">
              <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                <HelpCircle className="w-4 h-4 text-[color:var(--violet)]" />
              </span>
              <p className="text-sm text-slate-700">
                {unknownOutcomeCount} objection{unknownOutcomeCount > 1 ? "s" : ""}{" "}
                sans issue connue — le
                gagné/perdu vient des devis Brief acceptés/refusés et des deals fermés dans votre CRM connecté. Plus
                l&apos;issue est connue, plus la bibliothèque dit quelles réponses gagnent.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Décrivez une objection (ex. « c'est trop cher »)…"
            className="pl-9 pr-3.5 py-2 border border-border rounded-lg text-sm text-slate-700 bg-white w-full focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]"
          />
        </div>
        <button
          onClick={runSearch}
          disabled={searching || !query.trim()}
          className="inline-flex items-center gap-2 h-9 px-3.5 brand-gradient text-white rounded-lg text-sm font-medium shadow-[var(--shadow-sm)] hover:brightness-110 transition-all disabled:opacity-50"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Recherche sémantique
        </button>
        {searchResults !== null && (
          <button
            onClick={clearSearch}
            className="h-9 px-3.5 text-sm font-medium text-slate-600 border border-border rounded-lg bg-white hover:bg-slate-50 transition-colors"
          >
            Réinitialiser
          </button>
        )}
        {searchResults === null && (
          <div className="inline-flex items-center gap-1 bg-white rounded-xl border border-border shadow-[var(--shadow-xs)] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`h-8 px-3 rounded-lg text-[13px] font-medium transition-colors ${
                  filter === f.key ? "brand-gradient text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {searchError && <p className="mt-3 text-sm text-red-600">{searchError}</p>}

      <div className="mt-5 space-y-3">
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <div className="bg-white rounded-2xl border border-border p-8 text-center text-slate-400 text-sm">
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
          <div className="bg-white rounded-2xl border border-border p-10 text-center">
            <span className="w-12 h-12 rounded-xl bg-[color:var(--lavender)] text-[color:var(--violet)] flex items-center justify-center mx-auto mb-4">
              <MessagesSquare className="w-6 h-6" />
            </span>
            <p className="font-medium text-slate-900 text-sm">La bibliothèque se remplit toute seule</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              À chaque call analysé, Brief extrait les objections soulevées et la réponse apportée. Toute
              l&apos;équipe en bénéficie dès le premier call enregistré.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-8 text-center text-slate-400 text-sm">
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
