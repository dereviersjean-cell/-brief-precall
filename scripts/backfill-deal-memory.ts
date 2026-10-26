// Backfill : tire la fiche deal (Deal Execution, migrations 029 et 030) des
// calls déjà en base d'une organisation, rattachés à leur deal.
//
// Les calls sont traités du plus ancien au plus récent : la fiche d'un call
// se génère avec ce que les calls précédents du même deal ont retenu, il faut
// donc que ceux-là soient faits d'abord.
//
// Un appel Sonnet 5.5 par call (environ moitié moins qu'Opus, deux quand le
// deal n'est reconnu qu'après la première fiche). Simulation par défaut :
// affiche le rattachement prévu de chaque call, sans appel IA ni écriture.
// `--apply` génère et enregistre (remplace la fiche existante). `--call=<id>`
// pour un seul call. Les calls de moins de MIN_TRANSCRIPT_CHARS caractères
// sont ignorés : tests de quelques secondes, rien à en tirer.
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/backfill-deal-memory.ts --org=<id> [--call=<id>] [--apply]

import { supabaseAdmin } from "../lib/supabase";
import { getCallWithAnalysis, getOrganizationEmailDomains } from "../lib/db";
import { runDealMemoryForCall } from "../lib/deal-memory-run";
import { dealIdentityFor } from "../lib/deal-grouping";
import { DEAL_ALERT_RULES } from "../lib/deal-memory-schema";

const MIN_TRANSCRIPT_CHARS = 2000;

type Row = {
  id: string;
  user_id: string;
  meeting_title: string | null;
  company_name: string | null;
  prospect_company: string | null;
  contact_email: string | null;
  started_at: string | null;
  created_at: string;
  transcript: string | null;
};

function arg(name: string): string | null {
  const match = process.argv.find((a) => a.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : null;
}

async function main() {
  const orgId = arg("org");
  const onlyCall = arg("call");
  const apply = process.argv.includes("--apply");
  if (!orgId) throw new Error("--org=<id> obligatoire");

  const { data: users, error: usersError } = await supabaseAdmin.from("users").select("id").eq("organization_id", orgId);
  if (usersError) throw usersError;
  const userIds = (users ?? []).map((u) => (u as { id: string }).id);

  let query = supabaseAdmin
    .from("calls")
    .select("id, user_id, meeting_title, company_name, prospect_company, contact_email, started_at, created_at, transcript")
    .in("user_id", userIds);
  if (onlyCall) query = query.eq("id", onlyCall);
  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[])
    .filter((r) => (r.transcript?.length ?? 0) >= MIN_TRANSCRIPT_CHARS)
    .sort((a, b) => (a.started_at ?? a.created_at).localeCompare(b.started_at ?? b.created_at));
  const ownDomains = await getOrganizationEmailDomains(orgId);
  const ruleLabels = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

  console.log(`${rows.length} call(s), du plus ancien au plus récent${apply ? "" : " — SIMULATION, rien n'est généré ni écrit (--apply)"}\n`);

  for (const row of rows) {
    const title = row.meeting_title || row.company_name || row.id;
    const identity = dealIdentityFor({ contactEmail: row.contact_email, prospectCompany: row.prospect_company, companyName: row.company_name, ownDomains });
    const plan = identity
      ? `deal ${identity.domain ?? ""}${identity.domain && identity.nameKey ? " / " : ""}${identity.nameKey ?? ""}`
      : "deal à reconnaître d'après la fiche";
    console.log(`━━ ${(row.started_at ?? row.created_at).slice(0, 10)} ${title} (${row.id}) → ${plan}`);
    if (!apply) continue;

    try {
      const call = await getCallWithAnalysis(row.id, row.user_id);
      if (!call) throw new Error("call introuvable");
      const stored = await runDealMemoryForCall(call, orgId);
      for (const alert of stored.alerts) console.log(`  ⚠ ${ruleLabels.get(alert.rule) ?? alert.rule} : ${alert.text}`);
      console.log("  ✔ enregistrée\n");
    } catch (err) {
      console.error(`  ✖ ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
