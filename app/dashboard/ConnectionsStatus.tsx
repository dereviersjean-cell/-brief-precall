import Link from "next/link";
import { getCrmTokens, getDigestPreference } from "@/lib/db";
import { hasSlackConnection } from "@/lib/slack";

function StatusRow({ label, connected, href }: { label: string; connected: boolean; href: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-600">{label}</span>
      {connected ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Connecté
        </span>
      ) : (
        <Link href={href} className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          Connecter
        </Link>
      )}
    </div>
  );
}

// Server component, direct DB reads (no client fetches needed) — a compact
// "is everything wired up" glance, each row linking to where you'd actually
// fix it if not. Digest gets its own line since it's opt-in per timing
// rather than a binary connect/disconnect like the others.
export default async function ConnectionsStatus({ userId }: { userId: string }) {
  const [hubspot, pipedrive, slack, digest] = await Promise.all([
    getCrmTokens(userId, "hubspot"),
    getCrmTokens(userId, "pipedrive"),
    hasSlackConnection(userId),
    getDigestPreference(userId),
  ]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Connexions & distribution</h2>
      <div className="divide-y divide-slate-100">
        <StatusRow label="HubSpot" connected={hubspot !== null} href="/settings/crm" />
        <StatusRow label="Pipedrive" connected={pipedrive !== null} href="/settings/crm" />
        <StatusRow label="Slack" connected={slack} href="/settings/connexions" />
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-slate-600">Digest hebdomadaire</span>
          {digest.enabled ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Activé
            </span>
          ) : (
            <Link href="/notifications" className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              Activer
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
