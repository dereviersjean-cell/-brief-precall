"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationWithCounts } from "@/lib/db";
import { AdminNav } from "@/app/admin/AdminNav";

function NewOrganizationForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la création.");
      }
      setName("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
      >
        + Nouvelle organisation
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          placeholder="Nom de l'organisation"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        Créer
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
      >
        Annuler
      </button>
    </form>
  );
}

export default function OrganizationsAdminClient({
  organizations,
}: {
  organizations: OrganizationWithCounts[];
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8F9FA] ml-48">
      <AdminNav />
      <div className="py-10 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Organisations</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {organizations.length} organisation{organizations.length > 1 ? "s" : ""}
              </p>
            </div>
            <NewOrganizationForm onCreated={() => router.refresh()} />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            {organizations.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-12">Aucune organisation pour l&apos;instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                      <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Managers</th>
                      <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Commerciaux</th>
                      <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <tr
                        key={org.id}
                        onClick={() => router.push(`/admin/organizations/${org.id}`)}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-3 pr-4 text-slate-800 font-medium">{org.name}</td>
                        <td className="py-3 pr-4 text-slate-700 text-right font-mono">{org.managers_count}</td>
                        <td className="py-3 pr-4 text-slate-700 text-right font-mono">{org.commercials_count}</td>
                        <td className="py-3 text-slate-700 text-right font-mono">{org.total_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
