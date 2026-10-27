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
      window.location.href = "/brief";
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
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Monitoring
        </Link>

        <FadeIn>
          <div className="rounded-2xl border border-border bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--lavender)] text-[17px] font-semibold text-[color:var(--violet)]">
                  {(user.name || user.email).slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h1 className="flex flex-wrap items-center gap-3 text-[24px] font-semibold leading-tight tracking-[-0.03em] text-slate-900">
                    {user.name || user.email}
                    <RoleBadge role={user.role} />
                  </h1>
                  {user.name && <p className="mt-0.5 text-[13.5px] text-slate-500">{user.email}</p>}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  onClick={handleImpersonate}
                  disabled={impersonating || user.disabled_at != null}
                  title={user.disabled_at != null ? "Compte désactivé — impersonation impossible." : undefined}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[color:var(--danger-soft)] bg-white px-3.5 text-[13px] font-medium text-rose-700 transition-colors hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {impersonating ? <Spinner className="h-4 w-4 text-rose-700" /> : <KeyRound className="h-4 w-4" />}
                  Se connecter en tant que ce user
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {refreshing ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
                  Actualiser
                </button>
              </div>
            </div>
          </div>
        </FadeIn>

        {impersonateError && (
          <p className="rounded-xl bg-[color:var(--danger-soft)] px-4 py-3 text-[13px] text-rose-700">
            {impersonateError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Briefs générés" value={user.briefs_count} icon={<FileText className="w-4 h-4" />} accent="indigo" index={0} />
          <StatTile label="Appels analysés" value={user.calls_count} icon={<PhoneCall className="w-4 h-4" />} accent="violet" index={1} />
          <StatTile label="Emails envoyés" value={user.emails_sent_count} icon={<Mail className="w-4 h-4" />} accent="emerald" index={2} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Dernière activité</p>
            <p className="mt-2 text-[14px] font-medium tabular-nums text-slate-900">{formatAdminDate(user.last_activity_at)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Connexions</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {user.recall_connected ? (
                <span className="inline-flex items-center rounded-full bg-[color:var(--lavender)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--violet)]">Recall connecté</span>
              ) : (
                <span className="text-[12px] text-slate-400">Recall non connecté</span>
              )}
              {user.crm_connected.map((p) => (
                <CrmBadge key={p} provider={p} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8 rounded-2xl border border-border bg-white p-6">
          {state === "loading" && (
            <div className="flex items-center justify-center py-10">
              <Spinner className="w-6 h-6 text-[color:var(--violet)]" />
            </div>
          )}

          {state === "error" && (
            <p className="rounded-xl bg-[color:var(--danger-soft)] px-4 py-3 text-[13px] text-rose-700">
              Impossible de charger le statut Recall.
            </p>
          )}

          {state === "ready" && data && (
            <>
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                  Prochains rendez-vous avec bot programmé ({data.upcomingMeetings.length})
                </h3>
                <UpcomingMeetingsTable meetings={data.upcomingMeetings} showUserColumn={false} />
              </div>

              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                  Rendez-vous sans enregistrement récupéré ({data.failedRecordings.length})
                </h3>
                <p className="-mt-2 mb-3 text-[12px] text-slate-500">
                  Bot programmé sur les 7 derniers jours mais enregistrement jamais récupéré — transcript manquant ou refus/no-show.
                </p>
                <FailedRecordingsTable recordings={data.failedRecordings} showUserColumn={false} />
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-white p-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
            Historique impersonations ({impersonationLogs.length})
          </h3>
          {impersonationLogs.length === 0 ? (
            <p className="text-[13px] text-slate-500">Aucune impersonation enregistrée pour ce user.</p>
          ) : (
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                    Démarré le
                  </th>
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                    Terminé le
                  </th>
                  <th className="py-2 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">IP</th>
                  <th className="py-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                    User agent
                  </th>
                </tr>
              </thead>
              <tbody>
                {impersonationLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 tabular-nums text-slate-600">{formatAdminDate(log.started_at)}</td>
                    <td className="py-2.5 pr-4">
                      {log.ended_at ? (
                        <span className="tabular-nums text-slate-600">{formatAdminDate(log.ended_at)}</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-[color:var(--warning-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-amber-700">
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-slate-500">{log.ip_address ?? "—"}</td>
                    <td
                      className="max-w-xs truncate py-2.5 text-[12px] text-slate-500"
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
