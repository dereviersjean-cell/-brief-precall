"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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
  contactEmail,
  onClose,
  onSent,
}: {
  taskId: string;
  taskTitle: string;
  contactEmail: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [gmailNotConnected, setGmailNotConnected] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const generate = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/generate-email`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "La génération a échoué.");
      }
      const data = (await res.json()) as { subject: string; body: string };
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La génération a échoué.");
    }
  }, [taskId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await generate();
      setLoading(false);
    })();
  }, [generate]);

  async function handleRegenerate() {
    setRegenerating(true);
    await generate();
    setRegenerating(false);
  }

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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">{taskTitle}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
            <Spinner />
            Rédaction de l&apos;email par l&apos;IA…
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Destinataire</label>
              <input
                type="text"
                value={contactEmail}
                readOnly
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sujet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Corps de l&apos;email</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3">
            <p className="text-sm text-red-600">{error}</p>
            {gmailNotConnected && (
              <Link href="/settings" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium underline">
                Connecter Gmail dans les paramètres
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 gap-3 flex-wrap">
          <button
            onClick={handleRegenerate}
            disabled={loading || regenerating || sending}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            {regenerating ? "Régénération…" : "✨ Régénérer avec IA"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={sending}
              className="text-sm font-medium text-slate-600 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmitSend}
              disabled={loading || sending || !subject.trim() || !body.trim()}
              className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {sending && <Spinner />}
              {sending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
