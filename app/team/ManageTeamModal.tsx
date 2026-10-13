"use client";

import { useEffect, useState } from "react";
import type { OrganizationCommercial } from "@/lib/db";

type CommercialRow = OrganizationCommercial & { pending: boolean; error: string | null };

type LoadState = "loading" | "error" | "ready";

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function ManageTeamModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<LoadState>("loading");
  const [commercials, setCommercials] = useState<CommercialRow[]>([]);

  useEffect(() => {
    fetch("/api/team/available-commercials")
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json() as Promise<OrganizationCommercial[]>;
      })
      .then((data) => {
        setCommercials(data.map((c) => ({ ...c, pending: false, error: null })));
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  async function handleToggle(commercial: CommercialRow) {
    const nextLinked = !commercial.is_linked;

    setCommercials((prev) =>
      prev.map((c) => (c.id === commercial.id ? { ...c, is_linked: nextLinked, pending: true, error: null } : c))
    );

    try {
      const res = await fetch(nextLinked ? "/api/team/link" : "/api/team/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercialId: commercial.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Une erreur est survenue.");
      }
      setCommercials((prev) => prev.map((c) => (c.id === commercial.id ? { ...c, pending: false } : c)));
    } catch (err) {
      setCommercials((prev) =>
        prev.map((c) =>
          c.id === commercial.id
            ? { ...c, is_linked: !nextLinked, pending: false, error: err instanceof Error ? err.message : "Une erreur est survenue." }
            : c
        )
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1 shrink-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Gérer mon équipe</h2>
          <button onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 shrink-0 text-[13px] leading-relaxed text-slate-500">
          Rattachez ou détachez les commerciaux de votre organisation.
        </p>

        <div className="overflow-y-auto -mx-1 px-1">
          {state === "loading" && (
            <div className="flex justify-center py-8">
              <Spinner className="w-6 h-6 text-[color:var(--violet)]" />
            </div>
          )}

          {state === "error" && (
            <p className="rounded-xl bg-[color:var(--danger-soft)] px-3.5 py-2.5 text-[13px] text-rose-700">
              Impossible de charger la liste des commerciaux.
            </p>
          )}

          {state === "ready" && commercials.length === 0 && (
            <p className="text-[13px] text-slate-500">
              Aucun commercial dans votre organisation pour l&apos;instant. Contactez votre administrateur.
            </p>
          )}

          {state === "ready" && commercials.length > 0 && (
            <ul>
              {commercials.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-900">{c.name || c.email}</p>
                    {c.name && <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{c.email}</p>}
                    {c.error && <p className="mt-0.5 text-[11.5px] text-rose-700">{c.error}</p>}
                  </div>
                  <button
                    role="switch"
                    aria-checked={c.is_linked}
                    aria-label={`Rattacher ${c.name || c.email}`}
                    disabled={c.pending}
                    onClick={() => handleToggle(c)}
                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                      c.is_linked ? "bg-[color:var(--primary)]" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        c.is_linked ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
