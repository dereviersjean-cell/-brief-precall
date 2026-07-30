"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Plus, Sparkles } from "lucide-react";
import { Button, Card } from "@/app/components/ui/ui-bits";

type SuggestedCategory = {
  label: string;
  description: string;
  examplePhrasings: string[];
  occurrences: number;
  samples: string[];
};

// Fait émerger les catégories manquantes en regroupant les objections restées
// « non classées ». À 4 objections orphelines on repère le thème à l'œil ; à
// 60, non — et c'est précisément quand le volume monte que le manager en a le
// plus besoin.
export default function SuggestedCategories({ unclassifiedCount }: { unclassifiedCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedCategory[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [created, setCreated] = useState<Set<string>>(new Set());

  async function analyze() {
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/objections/categories/suggest", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "L'analyse a échoué.");
      setSuggestions((data as { categories: SuggestedCategory[] }).categories);
      setNote((data as { note?: string }).note ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'analyse a échoué.");
    } finally {
      setLoading(false);
    }
  }

  async function create(suggestion: SuggestedCategory) {
    setCreating(suggestion.label);
    setError(null);
    try {
      const res = await fetch("/api/objections/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: suggestion.label,
          description: suggestion.description,
          examplePhrasings: suggestion.examplePhrasings,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Création impossible.");
      }
      setCreated((prev) => new Set(prev).add(suggestion.label));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setCreating(null);
    }
  }

  if (unclassifiedCount === 0 && !suggestions) return null;

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Catégories qui vous manquent</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {unclassifiedCount} objection{unclassifiedCount > 1 ? "s" : ""} non classée
              {unclassifiedCount > 1 ? "s" : ""} — Brief les regroupe par thème pour repérer celles qui reviennent.
            </p>
          </div>
        </div>
        <Button size="sm" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={analyze} disabled={loading}>
          {loading ? "Analyse…" : suggestions ? "Relancer l'analyse" : "Analyser"}
        </Button>
      </div>

      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      {note && <p className="mt-4 text-sm italic text-slate-400">{note}</p>}

      {suggestions && suggestions.length > 0 && (
        <ul className="mt-4 space-y-3">
          {suggestions.map((suggestion) => {
            const done = created.has(suggestion.label);
            return (
              <li key={suggestion.label} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {suggestion.label}
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {suggestion.occurrences} occurrence{suggestion.occurrences > 1 ? "s" : ""}
                      </span>
                    </p>
                    {suggestion.description && (
                      <p className="mt-1 text-[13px] text-slate-500">{suggestion.description}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={done ? "secondary" : "outline"}
                    icon={done ? undefined : <Plus className="h-3.5 w-3.5" />}
                    onClick={() => create(suggestion)}
                    disabled={done || creating === suggestion.label}
                  >
                    {done ? "Créée" : creating === suggestion.label ? "Création…" : "Créer la catégorie"}
                  </Button>
                </div>

                <div className="mt-3 space-y-1.5 border-l-2 border-slate-200 pl-3">
                  {suggestion.samples.map((sample, i) => (
                    <p key={i} className="text-[12.5px] leading-relaxed text-slate-600">
                      «&nbsp;{sample}&nbsp;»
                    </p>
                  ))}
                </div>

                {done && (
                  <p className="mt-3 text-xs text-amber-600">
                    Ajoutez-lui une méthode de traitement dans « Vos objections de référence » — sans elle, les réponses
                    des commerciaux seront évaluées au jugement général et non par rapport à la vôtre.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {suggestions && suggestions.length > 0 && (
        <p className="mt-4 text-xs text-slate-400">
          Créer une catégorie ne reclasse pas l&apos;existant tout de suite : les objections déjà en base seront
          rattachées au prochain passage de classification.
        </p>
      )}
    </Card>
  );
}
