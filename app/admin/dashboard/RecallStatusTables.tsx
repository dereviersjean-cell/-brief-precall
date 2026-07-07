"use client";

export type UpcomingMeeting = {
  id: string;
  user_email: string;
  user_name: string | null;
  event_title: string;
  event_start_at: string | null;
  bot_scheduled: boolean;
  ineligibility_reason: string | null;
};

export type SuspiciousCall = {
  id: string;
  user_id: string;
  user_email: string;
  company_name: string | null;
  contact_email: string | null;
  recall_bot_id: string;
  created_at: string;
  botStatus: string;
};

export type MissedMeeting = {
  id: string;
  user_name: string | null;
  user_email: string;
  event_title: string;
  event_start_at: string;
  status_label: string;
};

export function formatRecallDate(iso: string | null) {
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

export function UpcomingMeetingsTable({
  meetings,
  showUserColumn = true,
}: {
  meetings: UpcomingMeeting[];
  showUserColumn?: boolean;
}) {
  const colSpan = showUserColumn ? 4 : 3;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            {showUserColumn && (
              <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Utilisateur</th>
            )}
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Événement</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
            <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Bot</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m) => (
            <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              {showUserColumn && (
                <td className="py-3 pr-4 text-slate-800 font-medium max-w-[200px] truncate">{m.user_name || m.user_email}</td>
              )}
              <td className="py-3 pr-4 text-slate-700 max-w-[280px] truncate">{m.event_title}</td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatRecallDate(m.event_start_at)}</td>
              <td className="py-3">
                <BotScheduledBadge scheduled={m.bot_scheduled} reason={m.ineligibility_reason} />
              </td>
            </tr>
          ))}
          {meetings.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="py-10 text-center text-slate-400 text-sm">
                Aucun rendez-vous à venir synchronisé.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SuspiciousCallsTable({
  calls,
  showUserColumn = true,
}: {
  calls: SuspiciousCall[];
  showUserColumn?: boolean;
}) {
  const colSpan = showUserColumn ? 4 : 3;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            {showUserColumn && (
              <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Utilisateur</th>
            )}
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Événement</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
            <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Statut</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              {showUserColumn && (
                <td className="py-3 pr-4 text-slate-800 font-medium max-w-[200px] truncate">{c.user_email}</td>
              )}
              <td className="py-3 pr-4 text-slate-700 max-w-[280px] truncate">
                {c.company_name || c.contact_email || "—"}
              </td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatRecallDate(c.created_at)}</td>
              <td className="py-3">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                  {c.botStatus}
                </span>
              </td>
            </tr>
          ))}
          {calls.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="py-10 text-center text-slate-400 text-sm">
                Aucun bot suspect détecté sur les 7 derniers jours.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function MissedMeetingsTable({
  meetings,
  showUserColumn = true,
}: {
  meetings: MissedMeeting[];
  showUserColumn?: boolean;
}) {
  const colSpan = showUserColumn ? 4 : 3;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            {showUserColumn && (
              <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Utilisateur</th>
            )}
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Événement</th>
            <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
            <th className="py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Statut</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m) => (
            <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              {showUserColumn && (
                <td className="py-3 pr-4 text-slate-800 font-medium max-w-[200px] truncate">{m.user_name || m.user_email}</td>
              )}
              <td className="py-3 pr-4 text-slate-700 max-w-[280px] truncate">{m.event_title}</td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatRecallDate(m.event_start_at)}</td>
              <td className="py-3">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                  {m.status_label}
                </span>
              </td>
            </tr>
          ))}
          {meetings.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="py-10 text-center text-slate-400 text-sm">
                Aucun rendez-vous manqué détecté sur les 7 derniers jours.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
