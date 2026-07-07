import type { ImpersonationLogItem } from "@/lib/db";
import { AdminNav } from "../AdminNav";
import { formatAdminDate } from "../dashboard/AdminBadges";

export default function ImpersonationLogsAdminClient({ logs }: { logs: ImpersonationLogItem[] }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] ml-48">
      <AdminNav />
      <div className="py-10 px-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Impersonations</h1>
            <p className="text-sm text-slate-500 mt-0.5">Les 20 dernières connexions admin en tant qu&apos;utilisateur</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Aucune impersonation enregistrée.</p>
            ) : (
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 pl-6 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Utilisateur cible
                    </th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">IP</th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      User agent
                    </th>
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Démarré le
                    </th>
                    <th className="py-3 pr-6 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Terminé le
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pl-6 pr-4">
                        <p className="text-slate-800 font-medium">
                          {log.target_user_name || log.target_user_email || log.target_user_id}
                        </p>
                        {log.target_user_name && log.target_user_email && (
                          <p className="text-slate-400 text-xs">{log.target_user_email}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 font-mono text-xs">{log.ip_address ?? "—"}</td>
                      <td className="py-3 pr-4 text-slate-500 text-xs max-w-xs truncate" title={log.user_agent ?? ""}>
                        {log.user_agent ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{formatAdminDate(log.started_at)}</td>
                      <td className="py-3 pr-6">
                        {log.ended_at ? (
                          <span className="text-slate-500">{formatAdminDate(log.ended_at)}</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            En cours
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
