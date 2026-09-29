"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AdminNav } from "./AdminNav";

// ─── Spinner ──────────────────────────────────────────────────────────────────
// Shared across every admin page that hits an async action (save, generate,
// refresh...) — previously copy-pasted verbatim into 6 different files.

export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────
// Only /admin itself needs to render this directly (it's the destination a
// redirect lands on) — every other admin route now gates server-side via
// isAdminAuthenticated() + redirect("/admin"), so this used to be duplicated
// six times for no reason.

export function AdminLoginForm({ onSuccess }: { onSuccess: () => void }) {
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
    <div className="brief-ui app-canvas min-h-screen bg-[color:var(--background)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-white p-8 shadow-[var(--shadow-md)]">
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="grid h-11 w-11 place-items-center rounded-xl brand-gradient text-base font-semibold text-white shadow-[var(--shadow-glow)]">
              B
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">Administration Brief</h1>
            <p className="mt-1 text-[13px] text-slate-500">Accès réservé à l&apos;équipe</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="••••••••"
                className={ADMIN_INPUT}
              />
            </div>
            {error && (
              <p className="rounded-lg border border-[color:var(--danger-soft)] bg-[color:var(--danger-soft)] px-3 py-2 text-[13px] text-rose-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg brand-gradient text-[13.5px] font-medium text-white shadow-[var(--shadow-glow)] transition-all hover:brightness-110 disabled:opacity-50"
            >
              {loading && <Spinner />}
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────
// Sidebar + background wrapper, previously copy-pasted (with a slightly
// different hex background each time) into every single admin page.

export function AdminPageShell({
  children,
  maxWidth = "max-w-7xl",
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  // Même fond, même police et même largeur de barre latérale (w-60) que
  // l'app client : l'admin est le même produit, vu de l'autre côté.
  return (
    <div className="brief-ui app-canvas min-h-screen bg-[color:var(--background)]">
      <AdminNav />
      <div className="ml-60 px-6 py-8 lg:px-10">
        <div className={`${maxWidth} mx-auto`}>{children}</div>
      </div>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────
// Même forme que PageHeader (app/components/ui/PageHeader.tsx) : pastille,
// titre, sous-titre, actions — sans carte ni halos, le contenu commence
// tout de suite.

export function AdminPageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  icon?: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--lavender-strong)] bg-[color:var(--lavender)] px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[color:var(--violet)]">
          {Icon && <Icon className="h-3 w-3" />}
          {eyebrow}
        </span>
        <h1 className="mt-2 text-[28px] font-semibold leading-[1.15] tracking-tight text-slate-900">{title}</h1>
        {subtitle && <div className="mt-1.5 text-[13.5px] text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Shared card & input ──────────────────────────────────────────────────────

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-sm)] ${className}`}>{children}</div>
  );
}

// Champ de saisie standard de l'admin (texte, mot de passe, zone de texte).
export const ADMIN_INPUT =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-[13.5px] text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[color:var(--ring)] focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)]/20";
