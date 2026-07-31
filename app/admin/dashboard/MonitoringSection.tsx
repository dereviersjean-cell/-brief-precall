"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";

// Vérification du monitoring depuis l'admin.
//
// Un monitoring qu'on croit actif alors qu'il ne l'est pas est PIRE que pas de
// monitoring : on cesse de surveiller en se croyant couvert. D'où un bouton
// permanent et non un test jetable — à rejouer après un changement de DSN, un
// changement d'environnement Vercel, ou dès qu'un silence paraît anormal.

type Status = { configured: boolean; environment: string; hint: string | null };

export default function MonitoringSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/monitoring-test")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Status | null) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  async function sendTest() {
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/monitoring-test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Envoi impossible.");
      setResult((data as { message: string }).message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-4">Monitoring (Sentry)</h2>

      {status === null ? (
        <p className="text-sm text-slate-400">Vérification…</p>
      ) : status.configured ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          DSN configurée sur l&apos;environnement <strong>{status.environment}</strong>
          {status.hint && <span className="text-slate-400 font-mono text-xs">({status.hint})</span>}
        </p>
      ) : (
        <p className="flex items-start gap-2 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Aucune <code>SENTRY_DSN</code> sur cet environnement ({status.environment}) — les échecs des webhooks et des
            crons ne remontent nulle part. Ajoutez la variable dans Vercel puis redéployez.
          </span>
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500 max-w-2xl">
        Sentry ne surveille pas les erreurs qui plantent — celles-là sont déjà visibles. Il surveille celles qui NE
        plantent pas : les étapes non bloquantes des webhooks et des crons, qui échouent en silence faute
        d&apos;utilisateur devant l&apos;écran.
      </p>

      <button
        onClick={sendTest}
        disabled={sending || !status?.configured}
        className="mt-4 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send className="w-3.5 h-3.5" />
        {sending ? "Envoi…" : "Envoyer une erreur de test"}
      </button>

      {result && (
        <p className="mt-3 text-sm text-emerald-700">
          {result} Si elle n&apos;apparaît pas d&apos;ici une minute, la DSN est invalide ou le projet Sentry n&apos;est
          pas le bon.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
