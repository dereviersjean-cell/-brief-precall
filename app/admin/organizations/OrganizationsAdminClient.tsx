"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Trash2 } from "lucide-react";
import type { OrganizationWithCounts } from "@/lib/db";
import { AdminPageShell, AdminPageHeader } from "@/app/admin/AdminShell";
import FadeIn from "@/app/dashboard/FadeIn";

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
        <Plus className="w-4 h-4" />
        Nouvelle organisation
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  async function handleDelete(org: OrganizationWithCounts) {
    if (!window.confirm(`Supprimer l'organisation "${org.name}" ?`)) return;

    setDeletingId(org.id);
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[org.id];
      return next;
    });

    try {
      const res = await fetch(`/api/admin/organizations/${org.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de la suppression.");
      }
      router.refresh();
    } catch (err) {
      setDeleteErrors((prev) => ({
        ...prev,
        [org.id]: err instanceof Error ? err.message : "Erreur lors de la suppression.",
      }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminPageShell maxWidth="max-w-4xl">
      <FadeIn>
        <AdminPageHeader
          icon={Building2}
          eyebrow="Multi-tenant"
          title="Organisations"
          subtitle={`${organizations.length} organisation${organizations.length > 1 ? "s" : ""}`}
          actions={<NewOrganizationForm onCreated={() => router.refresh()} />}
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
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
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Total</th>
                    <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right"></th>
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
                      <td className="py-3 pr-4 text-slate-700 text-right font-mono">{org.total_count}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(org);
                          }}
                          disabled={deletingId === org.id}
                          title="Supprimer l'organisation"
                          className="text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {deleteErrors[org.id] && (
                          <p className="text-xs text-red-600 mt-1 max-w-[180px] ml-auto text-left">
                            {deleteErrors[org.id]}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeIn>
    </AdminPageShell>
  );
}
