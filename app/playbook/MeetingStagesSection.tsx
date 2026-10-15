"use client";

import { useState } from "react";
import { Plus, X, Save, FlaskConical, Layers } from "lucide-react";
import { Button } from "@/app/components/ui/ui-bits";
import {
  MEETING_STAGES,
  MEETING_STAGE_LABELS,
  MEETING_STAGE_SHORT_LABELS,
  detectMeetingStage,
  type MeetingStage,
  type MeetingStageConfig,
} from "@/lib/meeting-stage";

// Section du Playbook, pas une page à part — les dimensions ci-dessus
// s'appliquent à tous les calls, cette section les affine par étape du
// cycle (R1/R2/R3) quand le titre du RDV la révèle. Anciennement une page
// séparée (/team/meeting-stages) ; fusionnée ici car c'est conceptuellement
// la même chose que le playbook : comment on évalue un call.
const STAGE_HINTS: Record<MeetingStage, string> = {
  r1: "Premier rendez-vous : découverte et qualification du besoin.",
  r2: "Deuxième rendez-vous : présentation ou démonstration personnalisée.",
  r3: "Rendez-vous de closing : négociation et signature.",
};

// `readOnly` : la page Playbook vit maintenant dans Performance, consultable
// par les commerciaux (c'est la grille sur laquelle ils sont notés) mais
// éditable par les seuls managers. Le verrou réel est côté serveur — les
// routes /api/team/meeting-stages et /api/playbook/* vérifient déjà le rôle
// en base ; ce prop ne fait que retirer des affordances qui échoueraient.
export default function MeetingStagesSection({
  initialConfig,
  readOnly = false,
}: {
  initialConfig: MeetingStageConfig;
  readOnly?: boolean;
}) {
  const [config, setConfig] = useState<MeetingStageConfig>(initialConfig);
  const [drafts, setDrafts] = useState<Record<MeetingStage, string>>({ r1: "", r2: "", r3: "" });
  const [testTitle, setTestTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const detected = testTitle.trim() ? detectMeetingStage(testTitle, config) : null;

  function addPattern(stage: MeetingStage) {
    const value = drafts[stage].trim();
    if (!value) return;
    setConfig((prev) => ({
      ...prev,
      [stage]: { ...prev[stage], patterns: [...prev[stage].patterns.filter((p) => p !== value), value] },
    }));
    setDrafts((prev) => ({ ...prev, [stage]: "" }));
    setMessage(null);
  }

  function removePattern(stage: MeetingStage, pattern: string) {
    setConfig((prev) => ({
      ...prev,
      [stage]: { ...prev[stage], patterns: prev[stage].patterns.filter((p) => p !== pattern) },
    }));
    setMessage(null);
  }

  function setGuidance(stage: MeetingStage, guidance: string) {
    setConfig((prev) => ({ ...prev, [stage]: { ...prev[stage], guidance } }));
    setMessage(null);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/team/meeting-stages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as MeetingStageConfig | { error?: string };
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Enregistrement impossible.");
      }
      setConfig(data as MeetingStageConfig);
      setMessage({ tone: "success", text: "Configuration enregistrée — appliquée aux prochains calls analysés." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Enregistrement impossible." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 rounded-[20px] bg-white ring-1 ring-[color:var(--lavender-strong)] shadow-[0_1px_2px_rgba(42,92,224,0.05),0_10px_28px_-20px_rgba(42,92,224,0.35)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color:var(--lavender)] text-[color:var(--violet)]">
            <Layers className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-slate-900">Étapes de rendez-vous (R1 / R2 / R3)</h2>
            <p className="mt-0.5 max-w-xl text-[12px] leading-relaxed text-slate-500">
              Les dimensions ci-dessus s&apos;appliquent à tous les calls. Affinez-les par étape du cycle
              si le titre du RDV dans l&apos;agenda la révèle — sans correspondance, l&apos;analyse générique s&apos;applique.
            </p>
          </div>
        </div>
        {!readOnly && (
          <Button variant="primary" size="sm" icon={<Save className="h-3.5 w-3.5" />} onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer les étapes"}
          </Button>
        )}
      </div>

      {message && (
        <p
          className={`mt-3 rounded-xl px-3.5 py-2.5 text-[12.5px] ${
            message.tone === "success"
              ? "bg-[color:var(--success-soft)] text-emerald-700"
              : "bg-[color:var(--danger-soft)] text-rose-700"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Testeur de titre — aperçu immédiat de la détection, même logique
          (lib/meeting-stage.ts) que celle exécutée à l'ingestion des calls. */}
      <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-3">
        <div className="mb-2.5 flex items-center gap-2">
          <FlaskConical className="h-3.5 w-3.5 text-[color:var(--violet)]" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Tester un titre de RDV</h3>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="Ex : Rencontre Oliverlist <> Acme"
            className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
          />
          <span className="text-[12.5px] text-slate-500 sm:shrink-0">
            {testTitle.trim() === "" ? (
              "Saisissez un titre pour voir l'étape détectée."
            ) : detected ? (
              <>
                Détecté :{" "}
                <span className="inline-flex items-center rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)]">
                  {MEETING_STAGE_LABELS[detected]}
                </span>
              </>
            ) : (
              "Aucune étape détectée — analyse générique."
            )}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {MEETING_STAGES.map((stage) => (
          <div key={stage} className="rounded-xl border border-border px-3.5 py-3.5 sm:px-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[color:var(--primary)] text-[10.5px] font-semibold text-white">
                {MEETING_STAGE_SHORT_LABELS[stage]}
              </span>
              <div className="min-w-0">
                <h3 className="text-[13.5px] font-semibold text-slate-900">{MEETING_STAGE_LABELS[stage]}</h3>
                <p className="text-[12px] text-slate-500">{STAGE_HINTS[stage]}</p>
              </div>
            </div>

            <div className="mt-3.5">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                Motifs de titre (insensible à la casse et aux accents)
              </label>
              {config[stage].patterns.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-1">
                  {config[stage].patterns.map((pattern) => (
                    <span
                      key={pattern}
                      className={`inline-flex items-center gap-1 rounded-full border border-border bg-white py-0.5 text-[11.5px] text-slate-600 ${
                        readOnly ? "px-2" : "pl-2 pr-1"
                      }`}
                    >
                      {pattern}
                      {!readOnly && (
                        <button
                          onClick={() => removePattern(stage, pattern)}
                          aria-label={`Retirer le motif ${pattern}`}
                          className="grid h-4 w-4 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {readOnly && config[stage].patterns.length === 0 && (
                <p className="text-[12.5px] italic text-slate-400">Aucun motif défini pour cette étape.</p>
              )}
              {!readOnly && (
              <div className="flex items-center gap-2">
                <input
                  value={drafts[stage]}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [stage]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPattern(stage);
                    }
                  }}
                  placeholder={stage === "r1" ? "Ex : Rencontre Oliverlist" : stage === "r2" ? "Ex : Présentation Oliverlist" : "Ex : Signature Oliverlist"}
                  className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
                />
                <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => addPattern(stage)}>
                  Ajouter
                </Button>
              </div>
              )}
            </div>

            <div className="mt-3.5">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                Consignes d&apos;analyse pour cette étape
              </label>
              {readOnly ? (
                <p className="whitespace-pre-wrap rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-slate-600">
                  {config[stage].guidance || <span className="italic text-slate-400">Aucune consigne pour cette étape.</span>}
                </p>
              ) : (
                <textarea
                  value={config[stage].guidance}
                  onChange={(e) => setGuidance(stage, e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 outline-none focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
                />
              )}
              <p className="mt-1.5 text-[11.5px] text-slate-500">
                Injectées dans l&apos;analyse des calls détectés {MEETING_STAGE_SHORT_LABELS[stage]}, en complément des dimensions ci-dessus.
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
