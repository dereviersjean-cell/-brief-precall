"use client";

import { useEffect, useState, useCallback } from "react";

type UpcomingMeeting = {
  id: string;
  user_email: string;
  user_name: string | null;
  event_title: string;
  event_start_at: string | null;
  bot_scheduled: boolean;
  ineligibility_reason: string | null;
};

type SuspiciousCall = {
  id: string;
  user_id: string;
  user_email: string;
  company_name: string | null;
  contact_email: string | null;
  recall_bot_id: string;
  created_at: string;
  botStatus: string;
};

type RecallStatusData = {
  upcomingMeetings: UpcomingMeeting[];
  suspiciousCalls: SuspiciousCall[];
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

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function BotScheduledBadge({ scheduled, reason }: { scheduled: boolean; reason: string | null }) {
  return scheduled ? (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
      Bot programmé
    </span>
  ) : (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"
      title={reason ?? undefined}
    >
      Pas de bot
    </span>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Utilisateur</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Événement</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                    <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Bot</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcomingMeetings.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 text-slate-800 font-medium max-w-[200px] truncate">{m.user_name || m.user_email}</td>
                      <td className="py-3 pr-4 text-slate-700 max-w-[280px] truncate">{m.event_title}</td>
                      <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatDate(m.event_start_at)}</td>
                      <td className="py-3">
                        <BotScheduledBadge scheduled={m.bot_scheduled} reason={m.ineligibility_reason} />
                      </td>
                    </tr>
                  ))}
                  {data.upcomingMeetings.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 text-sm">
                        Aucun rendez-vous à venir synchronisé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Bots suspects récents ({data.suspiciousCalls.length})
            </h3>
            <p className="text-xs text-slate-400 -mt-2 mb-3">
              Calls des 7 derniers jours avec un bot programmé mais aucun enregistrement récupéré.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Utilisateur</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Événement</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                    <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.suspiciousCalls.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 pr-4 text-slate-800 font-medium max-w-[200px] truncate">{c.user_email}</td>
                      <td className="py-3 pr-4 text-slate-700 max-w-[280px] truncate">
                        {c.company_name || c.contact_email || "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatDate(c.created_at)}</td>
                      <td className="py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          {c.botStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.suspiciousCalls.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 text-sm">
                        Aucun bot suspect détecté sur les 7 derniers jours.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
