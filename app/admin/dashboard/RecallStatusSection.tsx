"use client";

import { useEffect, useState, useCallback } from "react";
import { UpcomingMeetingsTable, SuspiciousCallsTable, MissedMeetingsTable } from "./RecallStatusTables";
import type { UpcomingMeeting, SuspiciousCall, MissedMeeting } from "./RecallStatusTables";

type RecallStatusData = {
  upcomingMeetings: UpcomingMeeting[];
  suspiciousCalls: SuspiciousCall[];
  missedMeetings: MissedMeeting[];
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Statut Recall</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing || state === "loading"}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {refreshing && <Spinner />}
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
              Bots suspects (transcript manquant) ({data.suspiciousCalls.length})
            </h3>
            <p className="text-xs text-slate-400 -mt-2 mb-3">
              Calls des 7 derniers jours avec un bot programmé mais aucun enregistrement récupéré.
            </p>
            <SuspiciousCallsTable calls={data.suspiciousCalls} />
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Rendez-vous passés sans enregistrement ({data.missedMeetings.length})
            </h3>
            <p className="text-xs text-slate-400 -mt-2 mb-3">
              Bot programmé sur un rendez-vous des 7 derniers jours, mais aucun call n&apos;a jamais été créé (refus, no-show…).
            </p>
            <MissedMeetingsTable meetings={data.missedMeetings} />
          </div>
        </>
      )}
    </div>
  );
}
