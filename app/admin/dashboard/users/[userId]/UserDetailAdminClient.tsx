"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import type { UserDetailForAdmin } from "@/lib/db";
import { AdminNav } from "@/app/admin/AdminNav";
import { RoleBadge, CrmBadge, formatAdminDate } from "@/app/admin/dashboard/AdminBadges";
import { UpcomingMeetingsTable, FailedRecordingsTable } from "@/app/admin/dashboard/RecallStatusTables";
import type { UpcomingMeeting, FailedRecording } from "@/app/admin/dashboard/RecallStatusTables";

type RecallStatusData = {
  upcomingMeetings: UpcomingMeeting[];
  failedRecordings: FailedRecording[];
};

type LoadState = "loading" | "error" | "ready";

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function UserDetailAdminClient({ user }: { user: UserDetailForAdmin }) {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<RecallStatusData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/recall-status?userId=${user.id}`);
      if (!res.ok) {
        setState("error");
        return;
      }
      setData(await res.json());
      setState("ready");
    } catch {
      setState("error");
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function handleImpersonate() {
    const confirmed = window.confirm(
      `Vous allez naviguer sur l'application dans la peau de ${user.name || user.email}. Continuer ?`
    );
    if (!confirmed) return;

    setImpersonating(true);
    setImpersonateError(null);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Erreur lors de l'impersonation.");
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setImpersonateError(err instanceof Error ? err.message : "Erreur lors de l'impersonation.");
      setImpersonating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] ml-48">
      <AdminNav />
      <div className="py-10 px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Retour au dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {user.name || user.email}
                <RoleBadge role={user.role} />
              </h1>
              {user.name && <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImpersonate}
                disabled={impersonating || user.disabled_at != null}
                title={user.disabled_at != null ? "Compte désactivé — impersonation impossible." : undefined}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {impersonating && <Spinner className="w-4 h-4 text-red-700" />}
                🔐 Se connecter en tant que ce user
              </button>
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

          {impersonateError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {impersonateError}
            </p>
          )}

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Briefs générés", value: user.briefs_count },
              { label: "Appels analysés", value: user.calls_count },
              { label: "Emails envoyés", value: user.emails_sent_count },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Dernière activité</p>
              <p className="text-sm text-slate-900 mt-1.5">{formatAdminDate(user.last_activity_at)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Connexions</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                {user.recall_connected ? (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">Recall connecté</span>
                ) : (
                  <span className="text-slate-300 text-xs">Recall non connecté</span>
                )}
                {user.crm_connected.map((p) => (
                  <CrmBadge key={p} provider={p} />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-8">
            {state === "loading" && (
              <div className="flex items-center justify-center py-10">
                <Spinner className="w-6 h-6 text-indigo-600" />
              </div>
            )}

            {state === "error" && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                Impossible de charger le statut Recall.
              </p>
            )}

            {state === "ready" && data && (
              <>
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    Prochains rendez-vous avec bot programmé ({data.upcomingMeetings.length})
                  </h3>
                  <UpcomingMeetingsTable meetings={data.upcomingMeetings} showUserColumn={false} />
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    Rendez-vous sans enregistrement récupéré ({data.failedRecordings.length})
                  </h3>
                  <p className="text-xs text-slate-400 -mt-2 mb-3">
                    Bot programmé sur les 7 derniers jours mais enregistrement jamais récupéré — transcript manquant ou refus/no-show.
                  </p>
                  <FailedRecordingsTable recordings={data.failedRecordings} showUserColumn={false} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
