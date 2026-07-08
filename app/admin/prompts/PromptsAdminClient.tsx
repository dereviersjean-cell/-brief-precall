"use client";

import { useEffect, useState, useCallback } from "react";
import type { FormEvent } from "react";
import {
  DEFAULT_CONFIG,
  DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT,
  DEFAULT_EMAIL_FOLLOWUP_PROMPT,
  DEFAULT_REPLY_SUGGESTION_PROMPT,
  DEFAULT_QUOTE_GENERATION_PROMPT,
  DEFAULT_QUOTE_EMAIL_PROMPT,
  DEFAULT_TASK_EMAIL_PROMPT,
} from "@/lib/admin-config";
import { AdminNav } from "../AdminNav";

type PromptKey =
  | "systemPrompt"
  | "call_analysis_system_prompt"
  | "email_followup_prompt"
  | "reply_suggestion_prompt"
  | "quote_generation_prompt"
  | "quote_email_prompt"
  | "task_email_prompt";

type Prompts = Record<PromptKey, string>;

type PageState = "loading" | "login" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";

const DEFAULTS: Prompts = {
  systemPrompt: DEFAULT_CONFIG.systemPrompt,
  call_analysis_system_prompt: DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT,
  email_followup_prompt: DEFAULT_EMAIL_FOLLOWUP_PROMPT,
  reply_suggestion_prompt: DEFAULT_REPLY_SUGGESTION_PROMPT,
  quote_generation_prompt: DEFAULT_QUOTE_GENERATION_PROMPT,
  quote_email_prompt: DEFAULT_QUOTE_EMAIL_PROMPT,
  task_email_prompt: DEFAULT_TASK_EMAIL_PROMPT,
};

const PROMPT_META: { key: PromptKey; title: string; description: string }[] = [
  {
    key: "systemPrompt",
    title: "Prompt Brief",
    description: "Définit le rôle et le style du modèle lors de la génération du brief pré-call (ton, format JSON, expertise attendue).",
  },
  {
    key: "call_analysis_system_prompt",
    title: "Prompt Analyse de call",
    description: "Instruction système utilisée pour noter et analyser les transcriptions d'appels (scoring 0-5 sur 4 dimensions, JSON de sortie).",
  },
  {
    key: "email_followup_prompt",
    title: "Prompt Email de suivi",
    description: "Mission et format injectés lors de la génération de l'email de suivi post-call envoyé au prospect.",
  },
  {
    key: "reply_suggestion_prompt",
    title: "Prompt Réponse prospect",
    description: "Instructions pour rédiger une réponse à un email entrant du prospect, en continuité du fil de conversation.",
  },
  {
    key: "quote_generation_prompt",
    title: "Prompt Génération de devis",
    description: "Instructions pour pré-remplir un devis (lignes, réduction argumentée, notes) à partir des calls analysés et emails échangés avec un contact.",
  },
  {
    key: "quote_email_prompt",
    title: "Prompt Email d'envoi de devis",
    description: "Instructions pour rédiger le sujet et le corps de l'email d'envoi d'un devis, personnalisé selon l'historique des échanges avec le prospect.",
  },
  {
    key: "task_email_prompt",
    title: "Prompt Email de task",
    description: "Instructions pour rédiger le sujet et le corps de l'email généré depuis une task (récap post-call, relance email, relance devis), ton adapté au type de task.",
  },
];

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError((data as { error?: string }).error ?? "Erreur inconnue.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">B</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Administration</h1>
          <p className="text-sm text-slate-500 mt-1">Accès réservé</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mot de passe admin
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading && <Spinner />}
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Prompt section ───────────────────────────────────────────────────────────

function PromptSection({
  title,
  description,
  promptKey,
  value,
  defaultValue,
  onChange,
}: {
  title: string;
  description: string;
  promptKey: PromptKey;
  value: string;
  defaultValue: string;
  onChange: (key: PromptKey, value: string) => void;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isDirty = value !== defaultValue;

  async function handleSave() {
    setSaveState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: promptKey, value }),
      });
      if (res.ok) {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2500);
      } else {
        const data = await res.json();
        setErrorMsg((data as { error?: string }).error ?? "Erreur inconnue.");
        setSaveState("error");
      }
    } catch {
      setErrorMsg("Impossible de contacter le serveur.");
      setSaveState("error");
    }
  }

  function handleReset() {
    onChange(promptKey, defaultValue);
    setSaveState("idle");
    setErrorMsg(null);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <textarea
        value={value}
        onChange={(e) => {
          onChange(promptKey, e.target.value);
          if (saveState === "saved" || saveState === "error") setSaveState("idle");
        }}
        rows={12}
        className="w-full px-3.5 py-3 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
      />
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handleReset}
          disabled={value === defaultValue}
          className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 disabled:opacity-30 disabled:no-underline transition-colors"
        >
          Restaurer les valeurs par défaut
        </button>
        <div className="flex items-center gap-3">
          {saveState === "saved" && (
            <span className="text-sm text-green-600 font-medium">Sauvegardé</span>
          )}
          {saveState === "error" && errorMsg && (
            <span className="text-sm text-red-600">{errorMsg}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saveState === "saving" || !value.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saveState === "saving" && <Spinner />}
            {saveState === "saving" ? "Sauvegarde…" : "Sauvegarder"}
          </button>
        </div>
      </div>
      {isDirty && saveState === "idle" && (
        <p className="text-xs text-amber-600">Modifications non sauvegardées</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PromptsAdminClient() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [prompts, setPrompts] = useState<Prompts>({ ...DEFAULTS });

  const fetchPrompts = useCallback(async () => {
    try {
      const authRes = await fetch("/api/admin/config");
      if (!authRes.ok) {
        setPageState("login");
        return;
      }
      const res = await fetch("/api/admin/prompts");
      if (!res.ok) {
        setPageState("login");
        return;
      }
      setPrompts(await res.json());
      setPageState("ready");
    } catch {
      setPageState("login");
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  function handleChange(key: PromptKey, value: string) {
    setPrompts((prev) => ({ ...prev, [key]: value }));
  }

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Spinner className="w-8 h-8 text-indigo-600" />
      </div>
    );
  }

  if (pageState === "login") {
    return <LoginForm onSuccess={fetchPrompts} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] ml-48">
      <AdminNav />
      <div className="py-10 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des prompts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Chaque prompt est sauvegardé indépendamment</p>
        </div>

        {PROMPT_META.map(({ key, title, description }) => (
          <PromptSection
            key={key}
            promptKey={key}
            title={title}
            description={description}
            value={prompts[key]}
            defaultValue={DEFAULTS[key]}
            onChange={handleChange}
          />
        ))}
      </div>
      </div>
    </div>
  );
}
