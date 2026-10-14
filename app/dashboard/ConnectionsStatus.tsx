import Link from "next/link";
import { getCrmTokens, getDigestPreference, getEnabledModulesForUser } from "@/lib/db";
import { hasSlackConnection } from "@/lib/slack";

function StatusRow({ label, connected, href }: { label: string; connected: boolean; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[13px] text-slate-900">{label}</span>
      {connected ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
          Connecté
        </span>
      ) : (
        <Link href={href} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--violet)] hover:underline">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
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
  const [hubspot, pipedrive, slack, digest, modules] = await Promise.all([
    getCrmTokens(userId, "hubspot"),
    getCrmTokens(userId, "pipedrive"),
    hasSlackConnection(userId),
    getDigestPreference(userId),
    getEnabledModulesForUser(userId),
  ]);

  // Une ligne par module ouvert (parcours client) ; aucune, pas de carte.
  const showCrm = modules.includes("crm");
  const showSlack = modules.includes("slack");
  const showDigest = modules.includes("weekly_digest");
  if (!showCrm && !showSlack && !showDigest) return null;

  return (
    <div className="rounded-[20px] bg-white ring-1 ring-[color:var(--lavender-strong)] shadow-[0_1px_2px_rgba(42,92,224,0.05),0_10px_28px_-20px_rgba(42,92,224,0.35)] p-4 sm:p-5">
      <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">Connexions & distribution</h2>
      <div className="divide-y divide-border">
        {showCrm && <StatusRow label="HubSpot" connected={hubspot !== null} href="/settings/connexions" />}
        {showCrm && <StatusRow label="Pipedrive" connected={pipedrive !== null} href="/settings/connexions" />}
        {showSlack && <StatusRow label="Slack" connected={slack} href="/settings/connexions" />}
        {showDigest && (
        <div className="flex items-center justify-between gap-3 py-2.5">
          <span className="text-[13px] text-slate-900">Digest hebdomadaire</span>
          {digest.enabled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" />
              Activé
            </span>
          ) : (
            <Link href="/notifications" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--violet)] hover:underline">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              Activer
            </Link>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
