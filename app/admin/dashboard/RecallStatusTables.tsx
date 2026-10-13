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

export type FailedRecording = {
  id: string;
  source: "call" | "meeting";
  user_id: string;
  user_email: string;
  user_name: string | null;
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
    <span className="inline-flex items-center rounded-full bg-[color:var(--success-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">
      Bot programmé
    </span>
  ) : (
    <span
      className="inline-flex items-center rounded-full bg-[color:var(--warning-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-amber-700"
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
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {showUserColumn && (
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Utilisateur</th>
            )}
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Événement</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Date</th>
            <th className="py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Bot</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m) => (
            <tr key={m.id} className="border-b border-border transition-colors last:border-b-0 hover:bg-slate-50">
              {showUserColumn && (
                <td className="max-w-[200px] truncate py-3 pr-4 font-medium text-slate-900">{m.user_name || m.user_email}</td>
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
              <td colSpan={colSpan} className="py-10 text-center text-[13px] text-slate-500">
                Aucun rendez-vous à venir synchronisé.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function FailedRecordingsTable({
  recordings,
  showUserColumn = true,
}: {
  recordings: FailedRecording[];
  showUserColumn?: boolean;
}) {
  const colSpan = showUserColumn ? 4 : 3;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {showUserColumn && (
              <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Utilisateur</th>
            )}
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Événement</th>
            <th className="py-3 pr-4 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Date</th>
            <th className="py-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500 whitespace-nowrap">Statut</th>
          </tr>
        </thead>
        <tbody>
          {recordings.map((r) => (
            <tr key={r.id} className="border-b border-border transition-colors last:border-b-0 hover:bg-slate-50">
              {showUserColumn && (
                <td className="max-w-[200px] truncate py-3 pr-4 font-medium text-slate-900">{r.user_name || r.user_email}</td>
              )}
              <td className="py-3 pr-4 text-slate-700 max-w-[280px] truncate">{r.event_title}</td>
              <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatRecallDate(r.event_start_at)}</td>
              <td className="py-3">
                <span className="inline-flex items-center rounded-full bg-[color:var(--danger-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-rose-700">
                  {r.status_label}
                </span>
              </td>
            </tr>
          ))}
          {recordings.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="py-10 text-center text-[13px] text-slate-500">
                Aucun rendez-vous sans enregistrement détecté sur les 7 derniers jours.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
