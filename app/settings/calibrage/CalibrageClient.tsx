"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, Gauge, Play } from "lucide-react";
import { Button, Card } from "@/app/components/ui/ui-bits";
import type { ObjectionEvalAnnotation } from "@/lib/db";

type EvalRunCall = {
  callId: string;
  label: string;
  expectedCount: number;
  detectedCount: number;
  precision: number;
  recall: number;
  categoryAccuracy: number | null;
  missed: string[];
  spurious: string[];
  misplaced: { objection: string; expected: string | null; got: string | null }[];
};

type EvalRun = {
  total: { precision: number; recall: number; f1: number; categoryAccuracy: number | null };
  calls: EvalRunCall[];
  ranAt: string;
};

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)} %`;
}

// Trois seuils lisibles à l'œil plutôt qu'un chiffre nu : l'expert doit savoir
// en un coup d'œil si un score est bon, passable ou mauvais, sans avoir à
// mémoriser ce qu'est un « bon » rappel.
function toneFor(value: number | null): string {
  if (value === null) return "text-slate-400";
  if (value >= 0.85) return "text-emerald-600";
  if (value >= 0.65) return "text-amber-600";
  return "text-rose-600";
}

function Metric({ label, value, help }: { label: string; value: number | null; help: string }) {
  return (
    <div className="px-5 py-4">
      <p className={`text-[22px] font-semibold ${toneFor(value)}`}>{pct(value)}</p>
      <p className="mt-0.5 text-[13px] font-medium text-slate-900">{label}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{help}</p>
    </div>
  );
}

export default function CalibrageClient({ calls }: { calls: ObjectionEvalAnnotation[] }) {
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<EvalRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reviewed = calls.filter((c) => c.reviewed);

  async function runEval() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/objections/eval/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "La mesure a échoué.");
      setRun(data as EvalRun);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La mesure a échoué.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[color:var(--lavender)] text-[color:var(--violet)]">
          <Gauge className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-[15px] font-semibold text-slate-900">Calibrage de la détection d&apos;objections</h1>
          <p className="mt-0.5 max-w-2xl text-[12.5px] leading-relaxed text-slate-500">
            Vous relisez de vrais calls et indiquez les objections qui s&apos;y trouvent vraiment. Brief compare ensuite
            ce que l&apos;IA détecte à votre jugement, et en tire un score. C&apos;est ce qui permet de savoir si un
            réglage améliore les choses, au lieu de le deviner.
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <p className="text-[13px] font-semibold text-slate-900">Comment faire</p>
        <ol className="mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-slate-600">
          <li>
            <strong>1.</strong> Ouvrez un call ci-dessous et lisez l&apos;échange.
          </li>
          <li>
            <strong>2.</strong> Corrigez la liste d&apos;objections : retirez ce qui n&apos;en est pas, ajoutez ce qui
            manque, ajustez les catégories. <em>Ajouter ce qui manque est le plus important</em> — c&apos;est la seule
            façon de savoir ce que l&apos;IA laisse passer.
          </li>
          <li>
            <strong>3.</strong> Cliquez sur «&nbsp;Valider ce call&nbsp;».
          </li>
          <li>
            <strong>4.</strong> Avec 3 ou 4 calls validés, lancez la mesure.
          </li>
        </ol>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">
          <strong className="text-slate-900">{reviewed.length}</strong> call{reviewed.length > 1 ? "s" : ""} validé
          {reviewed.length > 1 ? "s" : ""} sur {calls.length}
        </p>
        <Button
          variant="primary"
          icon={<Play className="h-3.5 w-3.5" />}
          onClick={runEval}
          disabled={running || reviewed.length === 0}
        >
          {running ? "Mesure en cours… (1 à 2 min)" : "Lancer la mesure"}
        </Button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      {run && (
        <div className="mb-6">
          <Card padded={false} className="overflow-hidden">
            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Metric
                label="Objections retrouvées"
                value={run.total.recall}
                help="Sur les objections que vous avez identifiées, la part que l'IA a vue. Un score bas = elle en rate."
              />
              <Metric
                label="Détections justes"
                value={run.total.precision}
                help="Sur ce que l'IA remonte, la part qui est vraiment une objection. Un score bas = du bruit."
              />
              <Metric
                label="Bon rangement"
                value={run.total.categoryAccuracy}
                help="Part des objections rangées dans la catégorie que vous attendiez."
              />
            </div>
          </Card>

          <div className="mt-4 space-y-3">
            {run.calls.map((call) => (
              <Card key={call.callId} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-slate-900">{call.label}</p>
                  <p className="text-xs text-slate-400">
                    {call.expectedCount} attendue{call.expectedCount > 1 ? "s" : ""} · {call.detectedCount} détectée
                    {call.detectedCount > 1 ? "s" : ""}
                  </p>
                </div>

                {call.missed.length === 0 && call.spurious.length === 0 && call.misplaced.length === 0 ? (
                  <p className="mt-2 text-[13px] text-emerald-600">Parfait sur ce call.</p>
                ) : (
                  <div className="mt-3 space-y-2.5">
                    {call.missed.map((text, i) => (
                      <p key={`m${i}`} className="text-[13px] text-slate-700">
                        <span className="mr-2 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                          RATÉE
                        </span>
                        {text}
                      </p>
                    ))}
                    {call.spurious.map((text, i) => (
                      <p key={`s${i}`} className="text-[13px] text-slate-700">
                        <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          EN TROP
                        </span>
                        {text}
                      </p>
                    ))}
                    {call.misplaced.map((item, i) => (
                      <p key={`x${i}`} className="text-[13px] text-slate-700">
                        <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          MAL RANGÉE
                        </span>
                        {item.objection}
                        <span className="mt-0.5 block text-xs text-slate-400">
                          attendu «&nbsp;{item.expected ?? "non classée"}&nbsp;», obtenu «&nbsp;
                          {item.got ?? "non classée"}&nbsp;»
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="mb-2 text-[13px] font-semibold text-slate-900">Les calls</p>
      <Card padded={false} className="overflow-hidden">
        {calls.length === 0 ? (
          <p className="px-5 py-6 text-sm italic text-slate-400">
            Aucun call analysé pour l&apos;instant — ils apparaîtront ici au fur et à mesure.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {calls.map((call) => (
              <li key={call.callId}>
                <Link
                  href={`/settings/calibrage/${call.callId}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {call.reviewed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-slate-900">
                        {call.companyName || call.contactEmail || "Call sans société renseignée"}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {new Date(call.occurredAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {call.reviewed
                          ? ` · ${call.expected.length} objection${call.expected.length > 1 ? "s" : ""} validée${call.expected.length > 1 ? "s" : ""}`
                          : ` · ${call.detectedCount} détectée${call.detectedCount > 1 ? "s" : ""} par l'IA, à relire`}
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
