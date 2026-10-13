"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Mail } from "lucide-react";
import { Spinner, AdminPageShell, AdminPageHeader } from "../AdminShell";
import FadeIn from "@/app/dashboard/FadeIn";

type EmailResult = {
  email: { subject: string; body: string };
  prompt_used: string;
};

// ─── Email display ────────────────────────────────────────────────────────────

function EmailDisplay({ email }: { email: { subject: string; body: string } }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = `Objet : ${email.subject}\n\n${email.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Email généré</h2>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-border bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          {copied ? "Copié !" : "Copier"}
        </button>
      </div>
      <p className="mb-3 text-[14px] font-semibold text-slate-900">{email.subject}</p>
      <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 font-sans text-[13px] leading-relaxed text-slate-600">
        {email.body}
      </pre>
    </div>
  );
}

// ─── Prompt viewer ────────────────────────────────────────────────────────────

function PromptViewer({ prompt }: { prompt: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Prompt utilisé</h2>
        <a
          href="/admin/prompts"
          className="text-[12px] font-medium text-[color:var(--violet)] underline underline-offset-2"
        >
          Modifier ce prompt →
        </a>
      </div>
      <textarea
        readOnly
        value={prompt}
        rows={8}
        className="w-full resize-y rounded-xl border border-border bg-slate-50 px-3.5 py-3 font-mono text-[12px] leading-relaxed text-slate-500 focus:outline-none"
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TestEmailAdminClient() {
  const [transcript, setTranscript] = useState("");
  const [nextStepsRaw, setNextStepsRaw] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<EmailResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!transcript.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    const nextSteps = nextStepsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          nextSteps,
          contactEmail: contactEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Erreur inconnue.");
      } else {
        setResult(data as EmailResult);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AdminPageShell maxWidth="max-w-3xl">
      <FadeIn>
        <AdminPageHeader
          icon={Mail}
          eyebrow="Outils techniques"
          title="Test de l'email de suivi"
          subtitle="Génère un email de suivi à partir d’un transcript, avec le prompt enregistré."
        />
      </FadeIn>

      <div className="space-y-6">
        {/* Form */}
        <form onSubmit={handleGenerate} className="rounded-2xl border border-border bg-white p-6 space-y-5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1.5">
              Transcription *
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={15}
              required
              placeholder={"[00:00] Commercial : Bonjour...\n[00:20] Prospect : ..."}
              className="w-full px-3.5 py-3 rounded-xl border border-border bg-white text-[13px] text-slate-800 font-mono leading-relaxed focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)] resize-y"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1.5">
              Prochaines étapes <span className="font-normal normal-case tracking-normal text-slate-400">(une par ligne)</span>
            </label>
            <textarea
              value={nextStepsRaw}
              onChange={(e) => setNextStepsRaw(e.target.value)}
              rows={3}
              placeholder={"Envoyer une proposition commerciale\nPlanifier une démo technique"}
              className="w-full px-3.5 py-3 rounded-xl border border-border bg-white text-[13px] text-slate-800 leading-relaxed focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)] resize-y"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 mb-1.5">
              Email du destinataire
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="prospect@entreprise.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white text-[13px] text-slate-800 focus:border-[color:var(--violet)] focus:outline-none focus:ring-1 focus:ring-[color:var(--violet)]"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={generating || !transcript.trim()}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-4 text-[13.5px] font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating && <Spinner />}
              {generating ? "Génération en cours…" : "Générer l'email"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-[color:var(--danger-soft)] p-4 text-[13px] text-rose-700">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            <EmailDisplay email={result.email} />
            <PromptViewer prompt={result.prompt_used} />
          </>
        )}
      </div>
    </AdminPageShell>
  );
}
