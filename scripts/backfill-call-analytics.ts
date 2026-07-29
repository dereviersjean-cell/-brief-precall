// Backfill: calcule les métriques d'interaction (onglet Performance >
// Analytics) pour tous les calls existants qui ont déjà un transcript_json,
// et les écrit dans call_analytics (migration 006).
//
// Sans ce backfill, l'onglet Analytics n'affiche des interactions que pour
// les calls ingérés APRÈS le déploiement — l'onglet Activité, lui, marche
// tout de suite (il lit `calls` directement).
//
// 100 % local : aucun appel IA, aucun coût. Relançable sans risque (upsert
// sur la PK call_id).
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/backfill-call-analytics.ts

import { supabaseAdmin } from "../lib/supabase";
import { getUserOrganizationId, getUserName, saveCallAnalytics } from "../lib/db";
import { computeCallInteractionMetrics } from "../lib/call-analytics";
import type { TranscriptJson } from "../lib/recall";

type Row = {
  id: string;
  user_id: string;
  started_at: string | null;
  created_at: string;
  transcript_json: TranscriptJson | null;
  speaker_names_override: Record<string, string> | null;
};

async function main() {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("id, user_id, started_at, created_at, transcript_json, speaker_names_override")
    .not("transcript_json", "is", null);
  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const orgCache = new Map<string, string | null>();
  const nameCache = new Map<string, string | null>();

  let saved = 0;
  let skippedTooSparse = 0;

  for (const row of rows) {
    if (!row.transcript_json) continue;

    let organizationId = orgCache.get(row.user_id);
    if (organizationId === undefined) {
      organizationId = await getUserOrganizationId(row.user_id);
      orgCache.set(row.user_id, organizationId);
    }

    let commercialName = nameCache.get(row.user_id);
    if (commercialName === undefined) {
      commercialName = await getUserName(row.user_id);
      nameCache.set(row.user_id, commercialName);
    }

    const metrics = computeCallInteractionMetrics(
      row.transcript_json,
      row.speaker_names_override ?? {},
      commercialName
    );
    // Moins de 5 tours = transcript tronqué ou échoué : aucune ligne écrite,
    // le call reste simplement absent des moyennes (jamais compté comme zéro).
    if (!metrics) {
      skippedTooSparse++;
      continue;
    }

    await saveCallAnalytics({
      callId: row.id,
      userId: row.user_id,
      organizationId,
      occurredAt: row.started_at ?? row.created_at,
      ...metrics,
    });
    saved++;
    console.log(
      `[backfill-analytics] call ${row.id} — ratio ${metrics.talk_ratio_pct ?? "n/a"}%, interactivité ${metrics.interactivity_score}`
    );
  }

  console.log("\n=== Done ===");
  console.log({ totalCalls: rows.length, saved, skippedTooSparse });
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("\nFailed:", err);
    process.exit(1);
  }
);
