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
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] px-4"
      // May be nested inside a caller's own backdrop div (not portaled), so
      // a click here would otherwise bubble up and close that modal too —
      // stop it before calling this panel's own onClose.
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Personnaliser le prompt pour vos futures générations</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-slate-500">
          Cette modification n&apos;affectera que vos propres emails. Les autres commerciaux continueront d&apos;utiliser le
          prompt défini par votre manager pour « {templateName} ».
        </p>

        {!loading && (
          <span
            className={`inline-flex items-center mt-3 px-2 py-0.5 rounded-full text-[11.5px] font-semibold ${
              hasOverride ? "bg-[color:var(--lavender)] text-[color:var(--violet)]" : "bg-slate-100 text-slate-600"
            }`}
          >
            {hasOverride ? "Vous utilisez votre version personnalisée" : "Vous utilisez actuellement le prompt de votre manager"}
          </span>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            {hasOverride ? "Votre version personnelle" : "Prompt actuel"}
          </label>
          {loading ? (
            <div className="h-[220px] rounded-xl border border-border bg-slate-50 animate-pulse" />
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-sm text-slate-900 font-mono leading-relaxed outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-2 focus:ring-[color:var(--violet)]/15 resize-y"
            />
          )}
        </div>

        {error && <p className="mt-3 text-[13px] text-rose-700">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-5 flex-wrap">
          <button
            onClick={handleReset}
            disabled={!hasOverride || resetting || saving || loading}
            className="mr-auto inline-flex h-9 items-center justify-center rounded-lg border border-border bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? "Réinitialisation…" : "Réinitialiser au prompt du manager"}
          </button>
          <button
            onClick={onClose}
            disabled={saving || resetting}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving || resetting || !draft.trim()}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white hover:brightness-110 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
