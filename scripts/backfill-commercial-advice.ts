// Backfill : le conseil de Brief sur chaque commercial d'une organisation
// (lib/person-advice-ai.ts, migration 039, 28/10/2026) — le bandeau de
// l'onglet Équipe quand le manager clique sur lui. À relancer après
// scripts/backfill-deal-advice.ts : il reprend les conseils des deals.
//
// Un appel Haiku 5.5 par commercial (environ 0,002 $). Simulation par défaut :
// affiche le conseil sans l'enregistrer. `--apply` l'enregistre (exige la
// migration 039).
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/backfill-commercial-advice.ts --org=<id> [--apply]

import { supabaseAdmin } from "../lib/supabase";
import { getCallActivityForUsers, getOrganizationDealRules, getProgressFichesForUser, getUserName, setCommercialAdvice } from "../lib/db";
import { buildDealProgressNow } from "../lib/deal-progress";
import { writePersonAdvice } from "../lib/person-advice-ai";

const args = process.argv.slice(2);
const org = args.find((a) => a.startsWith("--org="))?.slice("--org=".length);
const apply = args.includes("--apply");
if (!org) {
  console.error("Usage : --org=<id> [--apply]");
  process.exit(1);
}

// Les commerciaux qui ont au moins un call rattaché à un deal.
const { data, error } = await supabaseAdmin.from("call_deal_memory").select("calls!inner(user_id)").eq("organization_id", org).not("deal_id", "is", null);
if (error) throw error;
const userIds = [
  ...new Set(((data ?? []) as { calls: { user_id: string } | { user_id: string }[] }[]).map((r) => (Array.isArray(r.calls) ? r.calls[0] : r.calls).user_id)),
];
const [rules, activity] = await Promise.all([getOrganizationDealRules(org), getCallActivityForUsers(userIds)]);

for (const userId of userIds) {
  const name = (await getUserName(userId)) ?? "le commercial";
  const deals = buildDealProgressNow(await getProgressFichesForUser(org, userId), rules).filter((d) => !d.hubspot?.closed);
  const { advice } = await writePersonAdvice({ name, deals, week: activity[userId]?.week ?? 0 });
  console.log(`\n${advice ? "✓" : "✗"} ${name} (${deals.length} deals)`);
  if (!advice) continue;
  console.log(`  ${advice.title}\n  ${advice.why}\n  ${advice.questions.join("\n  ")}`);
  if (apply) await setCommercialAdvice(userId, org, advice);
}
if (!apply) console.log("\n(simulation : --apply pour enregistrer)");
