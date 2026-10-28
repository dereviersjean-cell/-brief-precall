"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, RefreshCw, FileText, PhoneCall, Mail } from "lucide-react";
import type { UserDashboardStat, UserRole } from "@/lib/db";
import { Spinner, AdminPageShell, AdminPageHeader } from "../AdminShell";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";
import RecallStatusSection from "./RecallStatusSection";
import MonitoringSection from "./MonitoringSection";
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
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {ROLE_FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`inline-flex h-8 items-center rounded-full px-3 text-[12.5px] font-medium tabular-nums transition-colors ${
            value === f.value ? "bg-[color:var(--primary)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
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
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] font-semibold text-slate-500">
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
        className="rounded-lg px-2 py-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-border bg-white p-1 shadow-[var(--shadow-md)]">
            {user.disabled_at ? (
              <button
                onClick={handleRestore}
                disabled={loading}
                className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Réactiver
              </button>
            ) : (
              <button
                onClick={handleDisable}
                disabled={loading}
                className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Désactiver
              </button>
            )}
            {canResendInvitation && (
              <button
                onClick={handleResendInvitation}
                disabled={loading}
                className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Renvoyer l&apos;invitation
              </button>
            )}
            <button
              onClick={handleHardDelete}
              disabled={loading}
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-rose-700 hover:bg-[color:var(--danger-soft)] disabled:opacity-50"
            >
              Supprimer définitivement
            </button>
            {error && <p className="px-3 py-1.5 text-[12px] text-rose-700">{error}</p>}
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
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-border">
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Email</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Rôle</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Inscrit le</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 text-right">Briefs</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 text-right">Appels</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 text-right">Emails</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Dernière activité</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Recall</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">CRM</th>
            <th className="py-3 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((u) => (
            <tr
              key={u.id}
              onClick={() => router.push(`/admin/dashboard/users/${u.id}`)}
              className="cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-slate-50"
            >
              <td className="max-w-[200px] truncate py-3 pr-4 font-medium text-slate-900">{u.email}</td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <RoleBadge role={u.role} />
                  <DisabledBadge disabled={u.disabled_at != null} />
                </div>
              </td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatAdminDate(u.created_at)}</td>
              <td className="py-3 pr-4 text-slate-700 text-right tabular-nums">{u.briefs_count}</td>
              <td className="py-3 pr-4 text-slate-700 text-right tabular-nums">{u.calls_count}</td>
              <td className="py-3 pr-4 text-slate-700 text-right tabular-nums">{u.emails_sent_count}</td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatAdminDate(u.last_activity_at)}</td>
              <td className="py-3 pr-4">
                {u.recall_state === "connected" ? (
                  <span className="inline-flex items-center rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)]">Connecté</span>
                ) : u.recall_state === "disconnected" ? (
                  <span className="inline-flex items-center rounded-full bg-[color:var(--danger-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-rose-700">Coupé</span>
                ) : (
                  <span className="text-[12px] text-slate-300">—</span>
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
                  <span className="text-[12px] text-slate-300">—</span>
                )}
              </td>
              <td className="py-3 text-right">
                <UserActionsMenu user={u} onChanged={onChanged} />
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={10} className="py-12 text-center text-[13px] text-slate-500">
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
      <div className="brief-ui min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <Spinner className="w-8 h-8 text-[color:var(--violet)]" />
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
          eyebrow="Outils techniques"
          title="Monitoring"
          subtitle={`${stats.length} utilisateur${stats.length > 1 ? "s" : ""} sur la plateforme`}
          actions={
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
              Actualiser
            </button>
          }
        />
      </FadeIn>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Briefs générés" value={totalBriefs} icon={<FileText className="w-4 h-4" />} accent="indigo" index={0} />
        <StatTile label="Appels analysés" value={totalCalls} icon={<PhoneCall className="w-4 h-4" />} accent="violet" index={1} />
        <StatTile label="Emails envoyés" value={totalEmails} icon={<Mail className="w-4 h-4" />} accent="emerald" index={2} />
      </div>

      <FadeIn delay={0.1}>
        <div className="mb-6 rounded-2xl border border-border bg-white p-6">
          <RoleFilterBar value={roleFilter} onChange={setRoleFilter} counts={roleCounts} />
          <DashboardTable stats={filteredStats} onChanged={fetchStats} />
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <RecallStatusSection />
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="mt-6">
          <MonitoringSection />
        </div>
      </FadeIn>
    </AdminPageShell>
  );
}
