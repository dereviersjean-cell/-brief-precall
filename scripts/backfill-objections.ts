// One-off backfill: extracts objections from every existing call's
// transcript and indexes them into call_objections (module Bibliothèque
// d'objections) — populates the library retroactively instead of starting
// empty and waiting for new calls only.
//
// Prerequisite: the call_objections table + match_call_objections RPC must
// already exist in Supabase (SQL given separately, not committed to this
// repo — see docs/BRIEF_CONTEXT.md "Modules terminés").
//
// Does NOT touch calls' scores/summary/strengths/weaknesses/next_steps —
// only fills in the objections field on call_analysis rows that don't have
// any yet, via a narrow dedicated extraction (extractObjectionsFromTranscript),
// not a full re-analysis (see lib/call-analysis.ts for why).
//
// --force : retraite AUSSI les calls qui ont déjà des objections, au lieu de
// les sauter. Utile après une correction du pipeline pour repartir d'une
// extraction propre — indexCallObjections remplace désormais les objections
// d'un call au lieu de les empiler (correctif du 29/07/2026), donc relancer
// avec --force ne crée plus de doublons.
//
// Run from the repo root:
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/backfill-objections.ts [--force]

import { supabaseAdmin } from "../lib/supabase";
import { getUserOrganizationId, type CallObjection } from "../lib/db";
import { extractObjectionsFromTranscript } from "../lib/call-analysis";
import { indexCallObjections } from "../lib/objections";

type Row = {
  id: string;
  user_id: string;
  contact_email: string | null;
  transcript: string | null;
  transcript_json: { turns: { text: string; start_ms: number; end_ms: number; speaker_id: string }[] } | null;
  call_analysis: { id: string; objections: CallObjection[] | null } | { id: string; objections: CallObjection[] | null }[] | null;
};

function normalizeAnalysis<T>(raw: T | T[] | null): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

async function main() {
  const force = process.argv.includes("--force");

  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("id, user_id, contact_email, transcript, transcript_json, call_analysis(id, objections)")
    .not("transcript", "is", null);
  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];
  const orgCache = new Map<string, string | null>();

  let processed = 0;
  let skippedNoAnalysis = 0;
  let skippedAlreadyDone = 0;
  let skippedNoOrg = 0;
  let totalObjectionsFound = 0;

  for (const row of rows) {
    const analysis = normalizeAnalysis(row.call_analysis);
    if (!analysis) {
      skippedNoAnalysis += 1;
      continue;
    }
    if (!force && analysis.objections && analysis.objections.length > 0) {
      skippedAlreadyDone += 1;
      continue;
    }
    if (!row.transcript) continue;

    let organizationId = orgCache.get(row.user_id);
    if (organizationId === undefined) {
      organizationId = await getUserOrganizationId(row.user_id);
      orgCache.set(row.user_id, organizationId);
    }
    if (!organizationId) {
      skippedNoOrg += 1;
      continue;
    }

    console.log(`[backfill-objections] call ${row.id} — extracting...`);
    const objections = await extractObjectionsFromTranscript(row.transcript);

    const { error: updateError } = await supabaseAdmin
      .from("call_analysis")
      .update({ objections })
      .eq("id", analysis.id);
    if (updateError) {
      console.error(`[backfill-objections] failed to update call_analysis ${analysis.id}:`, updateError.message);
      continue;
    }

    if (objections.length > 0) {
      await indexCallObjections(organizationId, row.id, row.contact_email, objections, row.transcript, row.transcript_json?.turns ?? null).catch((err) =>
        console.error(`[backfill-objections] indexCallObjections failed for call ${row.id}:`, err instanceof Error ? err.message : String(err))
      );
    }

    processed += 1;
    totalObjectionsFound += objections.length;
    console.log(`[backfill-objections] call ${row.id} — ${objections.length} objection(s) found`);
  }

  console.log("\n=== Done ===");
  console.log({ totalCalls: rows.length, processed, totalObjectionsFound, skippedNoAnalysis, skippedAlreadyDone, skippedNoOrg });
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("\nFailed:", err);
    process.exit(1);
  }
);
