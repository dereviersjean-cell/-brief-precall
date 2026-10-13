"use client";

import { useEffect, useState, useCallback } from "react";

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function SendQuoteModal({
  quoteId,
  quoteNumber,
  clientEmail,
  onClose,
  onSent,
}: {
  quoteId: string;
  quoteNumber: string;
  clientEmail: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const generate = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/generate-email`, { method: "POST" });
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
  }, [quoteId]);

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
    try {
      const res = await fetch(`/api/quotes/${quoteId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de l'envoi.");
      }
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-md)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-900">Envoyer le devis {quoteNumber}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-slate-500">
            <Spinner />
            Rédaction de l&apos;email par l&apos;IA…
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-700">Destinataire</label>
              <input
                type="text"
                value={clientEmail}
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
              <p className="mt-1.5 text-[12px] text-slate-500">
                Un lien de consultation et de signature sera automatiquement ajouté au bas de l&apos;email lors de
                l&apos;envoi.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[color:var(--lavender)] px-3.5 py-2.5">
              <span className="text-[13px] font-medium text-slate-700">📎 {quoteNumber}.pdf</span>
              <span className="text-[12px] text-slate-500">(joint automatiquement)</span>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>
        )}

        <div className="flex items-center justify-between mt-5 gap-3 flex-wrap">
          <button
            onClick={handleRegenerate}
            disabled={loading || regenerating || sending}
            className="inline-flex h-9 items-center rounded-lg px-2 text-[13px] font-medium text-[color:var(--violet)] transition-colors hover:bg-[color:var(--lavender)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {regenerating ? "Régénération…" : "✨ Régénérer avec IA"}
          </button>
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
              disabled={loading || sending || !subject.trim() || !body.trim()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
