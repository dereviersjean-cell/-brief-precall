// Backfill : tire la fiche deal (Deal Execution, étape 1, migration 029) des
// calls déjà en base d'une organisation, pour que la phase de test parte des
// vrais calls existants plutôt que d'attendre les prochains.
//
// Un appel Opus par call (~0,10 $ sur un call d'une demi-heure). Simulation
// par défaut : affiche les fiches sans rien écrire. `--apply` les enregistre
// (remplace la fiche existante d'un call). `--call=<id>` pour un seul call.
// Les calls de moins de MIN_TRANSCRIPT_CHARS caractères sont ignorés : tests
// de quelques secondes, rien à en tirer.
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/backfill-deal-memory.ts --org=<id> [--call=<id>] [--apply]

import { supabaseAdmin } from "../lib/supabase";
import { getUserName, getUserOrganizationId, saveCallDealMemory } from "../lib/db";
import { generateDealMemory } from "../lib/deal-memory";
import { DEAL_ALERT_RULES, DEAL_MEMORY_FIELDS } from "../lib/deal-memory-schema";
import type { TranscriptJson } from "../lib/recall";

const MIN_TRANSCRIPT_CHARS = 2000;

type Row = {
  id: string;
  user_id: string;
  meeting_title: string | null;
  company_name: string | null;
  transcript: string | null;
  transcript_json: TranscriptJson | null;
  speaker_names_override: Record<string, string> | null;
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
    .select("id, user_id, meeting_title, company_name, transcript, transcript_json, speaker_names_override")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });
  if (onlyCall) query = query.eq("id", onlyCall);
  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).filter((r) => (r.transcript?.length ?? 0) >= MIN_TRANSCRIPT_CHARS || (r.transcript_json?.turns?.length ?? 0) > 20);
  console.log(`${rows.length} call(s) à traiter${apply ? "" : " — SIMULATION, rien n'est écrit (--apply pour enregistrer)"}\n`);

  const fieldLabels = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));
  const ruleLabels = new Map<string, string>(DEAL_ALERT_RULES.map((r) => [r.key, r.label]));

  for (const row of rows) {
    const title = row.meeting_title || row.company_name || row.id;
    try {
      const result = await generateDealMemory({
        transcript: row.transcript,
        turns: row.transcript_json?.turns ?? null,
        speakerNames: row.speaker_names_override ?? {},
        commercialName: await getUserName(row.user_id),
        meetingTitle: row.meeting_title,
      });

      console.log(`━━ ${title} (${row.id})`);
      for (const [key, items] of Object.entries(result.fields)) {
        console.log(`  ${fieldLabels.get(key) ?? key}`);
        for (const item of items ?? []) console.log(`    • ${item.text}\n      « ${item.verbatim} »`);
      }
      for (const alert of result.alerts) {
        console.log(`  ⚠ ${ruleLabels.get(alert.rule) ?? alert.rule} : ${alert.text}${alert.verbatim ? `\n      « ${alert.verbatim} »` : ""}`);
      }

      if (apply) {
        const organizationId = (await getUserOrganizationId(row.user_id)) ?? orgId;
        await saveCallDealMemory(row.id, organizationId, result, result.model);
        console.log("  ✔ enregistrée");
      }
      console.log("");
    } catch (err) {
      console.error(`✖ ${title} (${row.id}) :`, err instanceof Error ? err.message : String(err));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
