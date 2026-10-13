"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import type { EmailTemplate } from "@/lib/db";
import TemplatePromptSettingsModal from "@/app/components/TemplatePromptSettingsModal";

const DEFAULT_PROMPT_VALUE = "__default__";

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function TaskEmailModal({
  taskId,
  taskTitle,
  taskType,
  contactEmail,
  onClose,
  onSent,
}: {
  taskId: string;
  taskTitle: string;
  taskType?: string;
  contactEmail: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [gmailNotConnected, setGmailNotConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_PROMPT_VALUE);
  const [showPromptSettings, setShowPromptSettings] = useState(false);

  const generate = useCallback(
    async (templateId: string) => {
      setGenerating(true);
      setError(null);
      try {
        const res = await fetch(`/api/tasks/${taskId}/generate-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(templateId !== DEFAULT_PROMPT_VALUE ? { email_template_id: templateId } : {}),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "La génération a échoué.");
        }
        const data = (await res.json()) as { subject: string; body: string };
        setSubject(data.subject);
        setBody(data.body);
        setHasGenerated(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "La génération a échoué.");
      } finally {
        setGenerating(false);
      }
    },
    [taskId]
  );

  // Mount only: resolve the org's templates + default selection. No
  // generation here anymore — the user picks a template (optionally tweaks
  // their personal prompt via the settings icon) and explicitly clicks
  // "Générer avec IA" before any Claude call happens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTemplates(true);
      try {
        const res = await fetch("/api/email-templates");
        const data: EmailTemplate[] = res.ok ? await res.json() : [];
        if (!cancelled) {
          setTemplates(data);
          if (data.length > 0) {
            // Only one concrete heuristic is meaningful today: the immediate
            // post-call recap task maps to the first template (sort_order 0,
            // "Call 1" by default). Anything else falls back to the first
            // template in the list, per spec.
            const preferred = taskType === "mail_recap" ? data.find((t) => t.sort_order === 0) : undefined;
            setSelectedTemplateId((preferred ?? data[0]).id);
          }
        }
      } catch {
        // Non-blocking — dropdown just stays on "Prompt par défaut".
      }
      if (!cancelled) setLoadingTemplates(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmitSend() {
    if (!subject.trim() || !body.trim()) {
      setError("Le sujet et le corps de l'email sont requis.");
      return;
    }
    setSending(true);
    setError(null);
    setGmailNotConnected(false);
    try {
      const res = await fetch(`/api/tasks/${taskId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error ?? "Erreur lors de l'envoi.";
        if (message.includes("Gmail non connecté")) {
          setGmailNotConnected(true);
        }
        throw new Error(message);
      }
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  }

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-md)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900">{taskTitle}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Masqué quand l'organisation n'a aucun type de call (même règle que
            la page du call) : une liste réduite à « Prompt par défaut »
            n'offre aucun choix. */}
        {templates.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <label htmlFor="task-email-template" className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
            Type de call
          </label>
          <select
            id="task-email-template"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            disabled={loadingTemplates}
            className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-1.5 text-[12.5px] text-slate-700 outline-none transition-colors focus:border-[color:var(--violet)] disabled:opacity-50"
          >
            <option value={DEFAULT_PROMPT_VALUE}>Prompt par défaut</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <button
              onClick={() => setShowPromptSettings(true)}
              title="Personnaliser le prompt pour vos futures générations"
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
        )}

        {!hasGenerated ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            {generating ? (
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <Spinner />
                Rédaction de l&apos;email par l&apos;IA…
              </div>
            ) : (
              <>
                <p className="text-[13px] text-slate-500">Sélectionnez un type puis cliquez sur Générer</p>
                <button
                  onClick={() => generate(selectedTemplateId)}
                  disabled={loadingTemplates}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✨ Générer avec IA
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-700">Destinataire</label>
              <input
                type="text"
                value={contactEmail}
                readOnly
                className="w-full rounded-xl border border-border bg-slate-50 px-3.5 py-2 text-[13.5px] text-slate-500 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-700">Sujet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-700">Corps de l&apos;email</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-[color:var(--violet)] focus:ring-1 focus:ring-[color:var(--violet)] resize-y leading-relaxed"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5">
            <p className="text-[13px] text-rose-700">{error}</p>
            {gmailNotConnected && (
              <Link href="/settings" className="mt-1 inline-block text-[13px] font-medium text-[color:var(--violet)] underline underline-offset-2">
                Connecter Gmail dans les paramètres
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 gap-3 flex-wrap">
          {hasGenerated ? (
            <button
              onClick={() => generate(selectedTemplateId)}
              disabled={generating || sending}
              className="inline-flex h-9 items-center rounded-lg px-2 text-[13px] font-medium text-[color:var(--violet)] transition-colors hover:bg-[color:var(--lavender)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? "Régénération…" : "✨ Régénérer avec IA"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmitSend}
              disabled={!hasGenerated || sending || !subject.trim() || !body.trim()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending && <Spinner />}
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
      </div>

      {showPromptSettings && selectedTemplate && (
        <TemplatePromptSettingsModal
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.name}
          defaultSystemPrompt={selectedTemplate.system_prompt}
          onClose={() => setShowPromptSettings(false)}
        />
      )}
    </div>
  );
}
