"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, RefreshCw, FileText, PhoneCall, Mail } from "lucide-react";
import type { UserDashboardStat, UserRole } from "@/lib/db";
import { Spinner, AdminPageShell, AdminPageHeader } from "../AdminShell";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";
import RecallStatusSection from "./RecallStatusSection";
import { RoleBadge, CrmBadge, formatAdminDate } from "./AdminBadges";

type RoleFilter = "all" | UserRole;

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "manager", label: "Managers" },
  { value: "commercial", label: "Commerciaux" },
];

function RoleFilterBar({
  value,
  onChange,
  counts,
}: {
  value: RoleFilter;
  onChange: (v: RoleFilter) => void;
  counts: Record<RoleFilter, number>;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      {ROLE_FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === f.value ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {f.label} ({counts[f.value]})
        </button>
      ))}
    </div>
  );
}

function DisabledBadge({ disabled }: { disabled: boolean }) {
  if (!disabled) return null;
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600">
      Désactivé
    </span>
  );
}

function UserActionsMenu({ user, onChanged }: { user: UserDashboardStat; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: () => Promise<Response>) {
    setLoading(true);
    setError(null);
    try {
      const res = await action();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur.");
      }
      setOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  function handleDisable() {
    runAction(() => fetch(`/api/admin/users/${user.id}?mode=soft`, { method: "DELETE" }));
  }

  function handleRestore() {
    runAction(() => fetch(`/api/admin/users/${user.id}/restore`, { method: "POST" }));
  }

  function handleResendInvitation() {
    runAction(() => fetch(`/api/admin/users/${user.id}/resend-invitation`, { method: "POST" }));
  }

  function handleHardDelete() {
    if (
      !window.confirm(
        `Supprimer définitivement ${user.email} ? Cette action efface aussi tout son historique (briefs, appels, analyses...) et est irréversible.`
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        `Dernière confirmation : es-tu sûr(e) de vouloir supprimer définitivement ${user.email} ? Il n'y a aucun moyen de revenir en arrière.`
      )
    ) {
      return;
    }
    runAction(() => fetch(`/api/admin/users/${user.id}?mode=hard`, { method: "DELETE" }));
  }

  const canResendInvitation = user.invited_at != null && !user.sso_linked;

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
            {user.disabled_at ? (
              <button
                onClick={handleRestore}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Réactiver
              </button>
            ) : (
              <button
                onClick={handleDisable}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Désactiver
              </button>
            )}
            {canResendInvitation && (
              <button
                onClick={handleResendInvitation}
                disabled={loading}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Renvoyer l&apos;invitation
              </button>
            )}
            <button
              onClick={handleHardDelete}
              disabled={loading}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Supprimer définitivement
            </button>
            {error && <p className="px-3 py-1.5 text-xs text-red-600">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function DashboardTable({ stats, onChanged }: { stats: UserDashboardStat[]; onChanged: () => void }) {
  const router = useRouter();
  const sorted = [...stats].sort((a, b) => {
    const da = a.last_activity_at ?? a.created_at ?? "";
    const db = b.last_activity_at ?? b.created_at ?? "";
    return db.localeCompare(da);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Email</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Rôle</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Inscrit le</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Briefs</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Appels</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Emails</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Dernière activité</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recall</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">CRM</th>
            <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((u) => (
            <tr
              key={u.id}
              onClick={() => router.push(`/admin/dashboard/users/${u.id}`)}
              className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <td className="py-3 pr-4 text-slate-800 font-medium max-w-[200px] truncate">{u.email}</td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <RoleBadge role={u.role} />
                  <DisabledBadge disabled={u.disabled_at != null} />
                </div>
              </td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatAdminDate(u.created_at)}</td>
              <td className="py-3 pr-4 text-slate-700 text-right font-mono">{u.briefs_count}</td>
              <td className="py-3 pr-4 text-slate-700 text-right font-mono">{u.calls_count}</td>
              <td className="py-3 pr-4 text-slate-700 text-right font-mono">{u.emails_sent_count}</td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatAdminDate(u.last_activity_at)}</td>
              <td className="py-3 pr-4">
                {u.recall_connected ? (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">Connecté</span>
                ) : (
                  <span className="text-slate-300 text-xs">—</span>
                )}
              </td>
              <td className="py-3 pr-4">
                {u.crm_connected.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {u.crm_connected.map((p) => (
                      <CrmBadge key={p} provider={p} />
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-300 text-xs">—</span>
                )}
              </td>
              <td className="py-3 text-right">
                <UserActionsMenu user={u} onChanged={onChanged} />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                Aucun utilisateur
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardAdminClient() {
  const [stats, setStats] = useState<UserDashboardStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard-stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner className="w-8 h-8 text-indigo-600" />
      </div>
    );
  }

  const totalBriefs = stats.reduce((s, u) => s + u.briefs_count, 0);
  const totalCalls = stats.reduce((s, u) => s + u.calls_count, 0);
  const totalEmails = stats.reduce((s, u) => s + u.emails_sent_count, 0);

  const roleCounts: Record<RoleFilter, number> = {
    all: stats.length,
    manager: stats.filter((u) => u.role === "manager").length,
    commercial: stats.filter((u) => u.role === "commercial").length,
  };
  const filteredStats = roleFilter === "all" ? stats : stats.filter((u) => u.role === roleFilter);

  return (
    <AdminPageShell>
      <FadeIn>
        <AdminPageHeader
          icon={LayoutDashboard}
          eyebrow="Vue d'ensemble"
          title="Dashboard utilisateurs"
          subtitle={`${stats.length} utilisateur${stats.length > 1 ? "s" : ""} sur la plateforme`}
          actions={
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {refreshing ? <Spinner /> : <RefreshCw className="w-4 h-4" />}
              Actualiser
            </button>
          }
        />
      </FadeIn>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatTile label="Briefs générés" value={totalBriefs} icon={<FileText className="w-4 h-4" />} accent="indigo" index={0} />
        <StatTile label="Appels analysés" value={totalCalls} icon={<PhoneCall className="w-4 h-4" />} accent="violet" index={1} />
        <StatTile label="Emails envoyés" value={totalEmails} icon={<Mail className="w-4 h-4" />} accent="emerald" index={2} />
      </div>

      <FadeIn delay={0.1}>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <RoleFilterBar value={roleFilter} onChange={setRoleFilter} counts={roleCounts} />
          <DashboardTable stats={filteredStats} onChanged={fetchStats} />
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <RecallStatusSection />
      </FadeIn>
    </AdminPageShell>
  );
}
