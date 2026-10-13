"use client";

import { useState } from "react";

export default function InviteCommercialModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, name: name.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; invitationSent?: boolean };
      if (!res.ok) {
        throw new Error(data.error ?? "Une erreur est survenue.");
      }
      // Le compte est créé dans les deux cas. Mais annoncer « Invitation
      // envoyée » quand l'email a échoué envoyait le manager attendre un mail
      // qui n'arriverait jamais — et sans issue, puisqu'il ne peut plus
      // réinviter une adresse déjà prise. On le dit, et on renvoie vers le
      // bouton qui répare.
      if (data.invitationSent === false) {
        setSuccess(
          `Compte créé pour ${trimmedEmail}, mais l'email d'invitation n'est pas parti. Utilisez « Renvoyer l'invitation » sur sa ligne dans la liste.`
        );
        setTimeout(onClose, 6000);
      } else {
        setSuccess(`Invitation envoyée à ${trimmedEmail}`);
        setTimeout(onClose, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Inviter un collaborateur</h2>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 text-[13px] leading-relaxed text-slate-500">
          Créez un compte commercial pour votre organisation — il sera automatiquement rattaché à votre équipe.
        </p>

        {success ? (
          <p
            className={
              success.includes("n'est pas parti")
                ? "rounded-xl bg-[color:var(--warning-soft)] px-3.5 py-2.5 text-[13px] text-amber-700"
                : "rounded-xl bg-[color:var(--success-soft)] px-3.5 py-2.5 text-[13px] text-emerald-700"
            }
          >
            {success}
          </p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  placeholder="email@entreprise.com"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-700">Nom (optionnel)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom du collaborateur"
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
                />
              </div>
            </div>

            {error && (
              <p className="mb-4 rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-rose-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={!email.trim() || loading}
                className="inline-flex h-9 items-center rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Envoi…" : "Créer et envoyer l'invitation"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
