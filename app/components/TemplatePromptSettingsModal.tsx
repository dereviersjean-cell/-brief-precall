"use client";

import { useEffect, useState } from "react";
import type { EmailTemplateOverride } from "@/lib/db";

// Personal prompt override for one org email template (sous-étape C of
// Email Templates). Shared by the /tasks "Rédiger l'email" modal and the
// /feedback/[id] follow-up email block — both let a commercial tweak the
// manager's template prompt for their own future generations without
// touching the shared org row. Fetches the user's current override on open
// (the caller only ever has the manager's template list, never the
// override) and falls back to the manager's prompt as the starting draft
// when there isn't one yet.
export default function TemplatePromptSettingsModal({
  templateId,
  templateName,
  defaultSystemPrompt,
  onClose,
}: {
  templateId: string;
  templateName: string;
  defaultSystemPrompt: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [override, setOverride] = useState<EmailTemplateOverride | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/email-templates/${templateId}/override`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: EmailTemplateOverride | null) => {
        if (cancelled) return;
        setOverride(data);
        setDraft(data?.system_prompt ?? defaultSystemPrompt);
      })
      .catch(() => {
        if (!cancelled) setDraft(defaultSystemPrompt);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [templateId, defaultSystemPrompt]);

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/email-templates/${templateId}/override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_prompt: draft.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de l'enregistrement.");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      const res = await fetch(`/api/email-templates/${templateId}/override`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la réinitialisation.");
      setOverride(null);
      setDraft(defaultSystemPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la réinitialisation.");
    } finally {
      setResetting(false);
    }
  }

  const hasOverride = override !== null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4"
      // May be nested inside a caller's own backdrop div (not portaled), so
      // a click here would otherwise bubble up and close that modal too —
      // stop it before calling this panel's own onClose.
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold text-slate-900">Personnaliser le prompt pour vos futures générations</h2>
        <p className="text-sm text-slate-500 mt-1">
          Cette modification n&apos;affectera que vos propres emails. Les autres commerciaux continueront d&apos;utiliser le
          prompt défini par votre manager pour « {templateName} ».
        </p>

        {!loading && (
          <span
            className={`inline-flex items-center mt-3 px-2.5 py-1 rounded-full text-xs font-medium ${
              hasOverride ? "bg-[color:var(--lavender)] text-[color:var(--violet)]" : "bg-slate-100 text-slate-500"
            }`}
          >
            {hasOverride ? "Vous utilisez votre version personnalisée" : "Vous utilisez actuellement le prompt de votre manager"}
          </span>
        )}

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {hasOverride ? "Votre version personnelle" : "Prompt actuel"}
          </label>
          {loading ? (
            <div className="h-[220px] rounded-lg border border-border bg-slate-50 animate-pulse" />
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm text-slate-900 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] resize-y"
            />
          )}
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-5 flex-wrap">
          <button
            onClick={handleReset}
            disabled={!hasOverride || resetting || saving || loading}
            className="text-sm font-medium text-slate-600 border border-border px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 mr-auto"
          >
            {resetting ? "Réinitialisation…" : "Réinitialiser au prompt du manager"}
          </button>
          <button
            onClick={onClose}
            disabled={saving || resetting}
            className="text-sm font-medium text-slate-600 border border-border px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving || resetting || !draft.trim()}
            className="text-sm font-medium text-white brand-gradient px-4 py-2 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
