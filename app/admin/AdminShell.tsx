"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
          />
          <div className="relative">
            <div className="text-center mb-7">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm shadow-indigo-200">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Administration</h1>
              <p className="text-sm text-slate-500 mt-1">Accès réservé</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe admin</label>
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
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
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
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav />
      <div className="ml-64 px-6 lg:px-10 py-10">
        <div className={`${maxWidth} mx-auto`}>{children}</div>
      </div>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────
// The hero-header-with-blur-blobs pattern used across the rest of the app
// (see /team, /brief, /contacts) — same shape reused for every admin page,
// just with a different icon/eyebrow/title/actions each time.

export function AdminPageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 mb-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-gradient-to-tr from-emerald-100/40 to-transparent blur-3xl"
      />
      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full mb-3">
            <Icon className="w-3 h-3" />
            {eyebrow}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <div className="text-slate-500 text-sm mt-1">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ─── Shared card ──────────────────────────────────────────────────────────────

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${className}`}>{children}</div>;
}
