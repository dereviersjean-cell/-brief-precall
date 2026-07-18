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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Statut Recall</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing || state === "loading"}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {refreshing ? <Spinner /> : <RefreshCw className="w-4 h-4" />}
          Actualiser
        </button>
      </div>

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
              Prochains rendez-vous ({data.upcomingMeetings.length})
            </h3>
            <UpcomingMeetingsTable meetings={data.upcomingMeetings} />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Rendez-vous sans enregistrement récupéré ({data.failedRecordings.length})
            </h3>
            <p className="text-xs text-slate-400 -mt-2 mb-3">
              Bot programmé sur les 7 derniers jours mais enregistrement jamais récupéré — transcript manquant ou refus/no-show.
            </p>
            <FailedRecordingsTable recordings={data.failedRecordings} />
          </div>
        </>
      )}
    </div>
  );
}
