"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Spinner } from "../AdminShell";
import { UpcomingMeetingsTable, FailedRecordingsTable } from "./RecallStatusTables";
import type { UpcomingMeeting, FailedRecording } from "./RecallStatusTables";

type RecallStatusData = {
  upcomingMeetings: UpcomingMeeting[];
  failedRecordings: FailedRecording[];
};

type LoadState = "loading" | "error" | "ready";

export default function RecallStatusSection() {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<RecallStatusData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/recall-status");
      if (!res.ok) {
        setState("error");
        return;
      }
      setData(await res.json());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  return (
    <div className="space-y-8 rounded-2xl border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Statut Recall</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing || state === "loading"}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshing ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
          Actualiser
        </button>
      </div>

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
              Prochains rendez-vous ({data.upcomingMeetings.length})
            </h3>
            <UpcomingMeetingsTable meetings={data.upcomingMeetings} />
          </div>

          <div>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
              Rendez-vous sans enregistrement récupéré ({data.failedRecordings.length})
            </h3>
            <p className="-mt-2 mb-3 text-[12px] text-slate-500">
              Bot programmé sur les 7 derniers jours mais enregistrement jamais récupéré — transcript manquant ou refus/no-show.
            </p>
            <FailedRecordingsTable recordings={data.failedRecordings} />
          </div>
        </>
      )}
    </div>
  );
}
