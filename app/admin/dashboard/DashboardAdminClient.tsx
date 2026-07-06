"use client";

import { useEffect, useState, useCallback } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { UserDashboardStat, UserRole } from "@/lib/db";
import { AdminNav } from "../AdminNav";
import RecallStatusSection from "./RecallStatusSection";
import { RoleBadge, CrmBadge, formatAdminDate } from "./AdminBadges";

type RoleFilter = "all" | UserRole;

type DashboardState = "loading" | "login" | "ready";

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

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
            value === f.value
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {f.label} ({counts[f.value]})
        </button>
      ))}
    </div>
  );
}

function DashboardTable({ stats }: { stats: UserDashboardStat[] }) {
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
            <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CRM</th>
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
              <td className="py-3 pr-4"><RoleBadge role={u.role} /></td>
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
              <td className="py-3">
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
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={9} className="py-12 text-center text-slate-400 text-sm">
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
  const [state, setState] = useState<DashboardState>("loading");
  const [stats, setStats] = useState<UserDashboardStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const fetchStats = useCallback(async () => {
    try {
      const authRes = await fetch("/api/admin/config");
      if (!authRes.ok) {
        setState("login");
        return;
      }
      const statsRes = await fetch("/api/admin/dashboard-stats");
      if (!statsRes.ok) {
        setState("login");
        return;
      }
      setStats(await statsRes.json());
      setState("ready");
    } catch {
      setState("login");
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

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Spinner className="w-8 h-8 text-indigo-600" />
      </div>
    );
  }

  if (state === "login") {
    return <LoginForm onSuccess={fetchStats} />;
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
    <div className="min-h-screen bg-[#F8F9FA] ml-48">
      <AdminNav />
      <div className="py-10 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard utilisateurs</h1>
            <p className="text-sm text-slate-500 mt-0.5">{stats.length} utilisateur{stats.length > 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {refreshing && <Spinner />}
              Actualiser
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Briefs générés", value: totalBriefs },
            { label: "Appels analysés", value: totalCalls },
            { label: "Emails envoyés", value: totalEmails },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <RoleFilterBar value={roleFilter} onChange={setRoleFilter} counts={roleCounts} />
          <DashboardTable stats={filteredStats} />
        </div>

        <RecallStatusSection />
      </div>
      </div>
    </div>
  );
}
