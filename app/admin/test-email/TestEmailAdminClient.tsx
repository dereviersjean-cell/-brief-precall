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
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email généré</h2>
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50"
        >
          {copied ? "Copié !" : "Copier"}
        </button>
      </div>
      <p className="text-sm font-bold text-slate-800 mb-3">{email.subject}</p>
      <pre className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-xl px-4 py-3 font-sans">
        {email.body}
      </pre>
    </div>
  );
}

// ─── Prompt viewer ────────────────────────────────────────────────────────────

function PromptViewer({ prompt }: { prompt: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prompt utilisé</h2>
        <a
          href="/admin/prompts"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
        >
          Modifier ce prompt →
        </a>
      </div>
      <textarea
        readOnly
        value={prompt}
        rows={8}
        className="w-full px-3.5 py-3 border border-slate-100 rounded-lg text-xs text-slate-500 font-mono leading-relaxed bg-slate-50 resize-y focus:outline-none"
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
          eyebrow="Outil de test"
          title="Test email de suivi"
          subtitle="Historique email vide — ton par défaut"
        />
      </FadeIn>

      <div className="space-y-6">
        {/* Form */}
        <form onSubmit={handleGenerate} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Transcription *
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={15}
              required
              placeholder={"[00:00] Commercial : Bonjour...\n[00:20] Prospect : ..."}
              className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Prochaines étapes <span className="font-normal text-slate-400 normal-case">(une par ligne)</span>
            </label>
            <textarea
              value={nextStepsRaw}
              onChange={(e) => setNextStepsRaw(e.target.value)}
              rows={3}
              placeholder={"Envoyer une proposition commerciale\nPlanifier une démo technique"}
              className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Email du destinataire
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="prospect@entreprise.com"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={generating || !transcript.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {generating && <Spinner />}
              {generating ? "Génération en cours…" : "Générer l'email"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
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
