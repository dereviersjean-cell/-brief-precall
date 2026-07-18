"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, RefreshCw, KeyRound, FileText, PhoneCall, Mail } from "lucide-react";
import type { UserDetailForAdmin, ImpersonationLogItem } from "@/lib/db";
import { Spinner, AdminPageShell } from "@/app/admin/AdminShell";
import StatTile from "@/app/dashboard/StatTile";
import FadeIn from "@/app/dashboard/FadeIn";
import { RoleBadge, CrmBadge, formatAdminDate } from "@/app/admin/dashboard/AdminBadges";
import { UpcomingMeetingsTable, FailedRecordingsTable } from "@/app/admin/dashboard/RecallStatusTables";
import type { UpcomingMeeting, FailedRecording } from "@/app/admin/dashboard/RecallStatusTables";

type RecallStatusData = {
  upcomingMeetings: UpcomingMeeting[];
  failedRecordings: FailedRecording[];
};

type LoadState = "loading" | "error" | "ready";

export default function UserDetailAdminClient({
  user,
  impersonationLogs,
}: {
  user: UserDetailForAdmin;
  impersonationLogs: ImpersonationLogItem[];
}) {
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
    <AdminPageShell maxWidth="max-w-5xl">
      <div className="space-y-6">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au dashboard
        </Link>

        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/50 via-violet-200/40 to-transparent blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                  {(user.name || user.email).slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3 flex-wrap">
                    {user.name || user.email}
                    <RoleBadge role={user.role} />
                  </h1>
                  {user.name && <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleImpersonate}
                  disabled={impersonating || user.disabled_at != null}
                  title={user.disabled_at != null ? "Compte désactivé — impersonation impossible." : undefined}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {impersonating ? <Spinner className="w-4 h-4 text-red-700" /> : <KeyRound className="w-4 h-4" />}
                  Se connecter en tant que ce user
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {refreshing ? <Spinner /> : <RefreshCw className="w-4 h-4" />}
                  Actualiser
                </button>
              </div>
            </div>
          </div>
        </FadeIn>

        {impersonateError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {impersonateError}
          </p>
        )}

        <div className="grid grid-cols-3 gap-4">
          <StatTile label="Briefs générés" value={user.briefs_count} icon={<FileText className="w-4 h-4" />} accent="indigo" index={0} />
          <StatTile label="Appels analysés" value={user.calls_count} icon={<PhoneCall className="w-4 h-4" />} accent="violet" index={1} />
          <StatTile label="Emails envoyés" value={user.emails_sent_count} icon={<Mail className="w-4 h-4" />} accent="emerald" index={2} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Dernière activité</p>
            <p className="text-sm text-slate-900 mt-1.5">{formatAdminDate(user.last_activity_at)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
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

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-8">
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

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Historique impersonations ({impersonationLogs.length})
          </h3>
          {impersonationLogs.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune impersonation enregistrée pour ce user.</p>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Démarré le
                  </th>
                  <th className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Terminé le
                  </th>
                  <th className="py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">IP</th>
                  <th className="py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    User agent
                  </th>
                </tr>
              </thead>
              <tbody>
                {impersonationLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 text-slate-600">{formatAdminDate(log.started_at)}</td>
                    <td className="py-2 pr-4">
                      {log.ended_at ? (
                        <span className="text-slate-600">{formatAdminDate(log.ended_at)}</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-slate-500 font-mono text-xs">{log.ip_address ?? "—"}</td>
                    <td
                      className="py-2 text-slate-500 text-xs max-w-xs truncate"
                      title={log.user_agent ?? ""}
                    >
                      {log.user_agent ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminPageShell>
  );
}
