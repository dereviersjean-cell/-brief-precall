// One-off backfill: populate transcript_json + speaker_names_override
// (sous-étape A) for a single specific call that predates that feature —
// Hubert de la Lance's call with contact a.ravachol@velbruncapital.fr.
// Does NOT touch any other call, and does not change the ingestion pipeline.
//
// Run from the repo root:
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/backfill-single-call.ts
//
// (The --import registers scripts/lib/ts-ext-loader.mjs, a resolve hook that
// lets this script import the real lib/recall.ts + lib/db.ts modules despite
// their extension-less internal imports — Node's ESM loader requires
// explicit extensions, Next.js's own bundler doesn't. See that file for why.)

import { supabaseAdmin } from "../lib/supabase";
import { getTranscriptContent, buildTranscriptJson, resolveSpeakerNames } from "../lib/recall";
import { getUserName, getUserEmail } from "../lib/db";

const USER_ID = "39addb01-3110-4c96-ad24-2b22904bcd68"; // Hubert de la Lance
const CONTACT_EMAIL_FRAGMENT = "ravachol";

async function main() {
  // 1. Find the target call.
  const { data: matches, error: findError } = await supabaseAdmin
    .from("calls")
    .select("id, user_id, contact_email, company_name, transcript_id, recall_bot_id, transcript_json, speaker_names_override")
    .eq("user_id", USER_ID)
    .ilike("contact_email", `%${CONTACT_EMAIL_FRAGMENT}%`);
  if (findError) throw findError;
  if (!matches || matches.length === 0) throw new Error("No matching call found.");
  if (matches.length > 1) throw new Error(`Expected exactly one match, found ${matches.length}: ${matches.map((c) => c.id).join(", ")}`);

  const call = matches[0];
  console.log("=== BEFORE ===");
  console.log("call.id:", call.id);
  console.log("contact_email:", call.contact_email);
  console.log("company_name:", call.company_name);
  console.log("transcript_id:", call.transcript_id);
  console.log("recall_bot_id:", call.recall_bot_id);
  console.log("transcript_json:", call.transcript_json);
  console.log("speaker_names_override:", call.speaker_names_override);

  if (!call.transcript_id) throw new Error("Call has no transcript_id — cannot re-fetch from Recall.");

  // 2. Re-fetch the raw transcript from Recall using the stored transcript_id.
  const rawTranscript = await getTranscriptContent(call.transcript_id);

  // 3. Normalize into transcript_json.
  const transcriptJson = buildTranscriptJson(rawTranscript);
  console.log("\n=== buildTranscriptJson ===");
  console.log("turns:", transcriptJson.turns.length);
  console.log("total_duration_ms:", transcriptJson.total_duration_ms);

  // 4. Resolve initial speaker names using the same call context the
  // bot-webhook ingestion path builds (commercial name/email + the call's
  // known contact_email/company_name).
  const [commercialName, commercialEmail] = await Promise.all([getUserName(USER_ID), getUserEmail(USER_ID)]);
  const speakerNamesOverride = resolveSpeakerNames(rawTranscript, {
    commercialName,
    commercialEmail,
    contactEmail: call.contact_email,
    contactCompanyName: call.company_name,
  });
  console.log("\n=== resolveSpeakerNames ===");
  console.log("commercialName:", commercialName, "| commercialEmail:", commercialEmail);
  console.log("speaker_names_override:", speakerNamesOverride);

  // 5. Persist — this call only.
  const { error: updateError } = await supabaseAdmin
    .from("calls")
    .update({ transcript_json: transcriptJson, speaker_names_override: speakerNamesOverride })
    .eq("id", call.id);
  if (updateError) throw updateError;

  // 6. Confirm.
  const { data: after, error: afterError } = await supabaseAdmin
    .from("calls")
    .select("id, transcript_json, speaker_names_override")
    .eq("id", call.id)
    .maybeSingle();
  if (afterError) throw afterError;

  console.log("\n=== AFTER ===");
  console.log("call.id:", after?.id);
  console.log("transcript_json.turns.length:", after?.transcript_json?.turns?.length);
  console.log("transcript_json.total_duration_ms:", after?.transcript_json?.total_duration_ms);
  console.log("speaker_names_override:", after?.speaker_names_override);
}

main().then(
  () => {
    console.log("\nDone.");
    process.exit(0);
  },
  (err) => {
    console.error("\nFailed:", err);
    process.exit(1);
  }
);
