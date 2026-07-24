"use client";

import { useState } from "react";
import { Plus, X, Save, FlaskConical } from "lucide-react";
import { PageHeader } from "@/app/components/ui/PageHeader";
import { Card, Button } from "@/app/components/ui/ui-bits";
import {
  MEETING_STAGES,
  MEETING_STAGE_LABELS,
  MEETING_STAGE_SHORT_LABELS,
  detectMeetingStage,
  type MeetingStage,
  type MeetingStageConfig,
} from "@/lib/meeting-stage";

const STAGE_HINTS: Record<MeetingStage, string> = {
  r1: "Premier rendez-vous : découverte et qualification du besoin.",
  r2: "Deuxième rendez-vous : présentation ou démonstration personnalisée.",
  r3: "Rendez-vous de closing : négociation et signature.",
};

export default function MeetingStagesClient({ initialConfig }: { initialConfig: MeetingStageConfig }) {
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
    <div className="brief-ui max-w-4xl px-4 sm:px-10 py-8">
      <PageHeader
        eyebrow="Équipe"
        title="Étapes de rendez-vous"
        subtitle="Le titre du RDV dans l'agenda détermine son étape (R1, R2, R3) — chaque étape a ses propres consignes d'analyse. Sans correspondance, l'analyse générique s'applique."
        actions={
          <Button variant="primary" icon={<Save className="h-3.5 w-3.5" />} onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        }
      />

      {message && (
        <p
          className={`mt-3 rounded-lg border px-3.5 py-2.5 text-[12.5px] ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Testeur de titre — aperçu immédiat de la détection, même logique
          (lib/meeting-stage.ts) que celle exécutée à l'ingestion des calls. */}
      <Card className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="h-4 w-4 text-[color:var(--violet)]" />
          <h2 className="text-[13px] font-semibold text-slate-900">Tester un titre de RDV</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="Ex : Rencontre Oliverlist <> Acme"
            className="h-9 flex-1 rounded-lg border border-border bg-white px-3 text-[13px] text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--violet)]/30"
          />
          <span className="text-[12.5px] text-slate-500 shrink-0">
            {testTitle.trim() === "" ? (
              "Saisissez un titre pour voir l'étape détectée."
            ) : detected ? (
              <>
                Détecté :{" "}
                <span className="inline-flex items-center rounded-full border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--violet)]">
                  {MEETING_STAGE_LABELS[detected]}
                </span>
              </>
            ) : (
              "Aucune étape détectée — analyse générique."
            )}
          </span>
        </div>
      </Card>

      <div className="mt-5 space-y-5">
        {MEETING_STAGES.map((stage) => (
          <Card key={stage}>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg brand-gradient text-white text-[12px] font-semibold">
                {MEETING_STAGE_SHORT_LABELS[stage]}
              </span>
              <div>
                <h2 className="text-[14px] font-semibold text-slate-900">{MEETING_STAGE_LABELS[stage]}</h2>
                <p className="text-[12px] text-slate-500">{STAGE_HINTS[stage]}</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                Motifs de titre (insensible à la casse et aux accents)
              </label>
              {config[stage].patterns.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {config[stage].patterns.map((pattern) => (
                    <span
                      key={pattern}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 pl-2.5 pr-1.5 py-1 text-[12px] text-slate-700"
                    >
                      {pattern}
                      <button
                        onClick={() => removePattern(stage, pattern)}
                        aria-label={`Retirer le motif ${pattern}`}
                        className="grid h-4 w-4 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                  className="h-9 flex-1 rounded-lg border border-border bg-white px-3 text-[13px] text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--violet)]/30"
                />
                <Button variant="outline" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => addPattern(stage)}>
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                Consignes d&apos;analyse pour cette étape
              </label>
              <textarea
                value={config[stage].guidance}
                onChange={(e) => setGuidance(stage, e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 outline-none focus:ring-2 focus:ring-[color:var(--violet)]/30"
              />
              <p className="mt-1.5 text-[11.5px] text-slate-400">
                Injectées dans l&apos;analyse des calls détectés {MEETING_STAGE_SHORT_LABELS[stage]}, en complément du playbook.
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
