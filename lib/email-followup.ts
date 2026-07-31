import Anthropic from "@anthropic-ai/sdk";
import { readPromptConfig, DEFAULT_EMAIL_FOLLOWUP_PROMPT } from "./admin-config";
import { extractJsonObject } from "./ai-json";
import { validateAiShape } from "./ai-shape";

export type FollowUpEmail = {
  subject: string;
  body: string;
};

// generateReplyToProspect / generateReplyToProspectWithTemplate ("suggest a
// reply to what the prospect just wrote") were removed 25/07/2026 along with
// gmail.readonly — that feature genuinely needed the prospect's email body,
// which the app can no longer read (see lib/gmail.ts).

export async function generateFollowUpEmail(
  transcript: string,
  analysisNextSteps: string[],
  contactEmail: string
): Promise<FollowUpEmail | null> {
  const client = new Anthropic();

  const missionInstructions = (await readPromptConfig("email_followup_prompt")) ?? DEFAULT_EMAIL_FOLLOWUP_PROMPT;

  const nextStepsSection =
    analysisNextSteps.length > 0
      ? analysisNextSteps.map((s) => `- ${s}`).join("\n")
      : "Aucune prochaine étape identifiée — propose une prochaine étape pertinente basée sur le call.";

  const prompt = `Tu es un assistant commercial qui aide à rédiger des emails de suivi après un rendez-vous.

CE QUI S'EST DIT PENDANT LE DERNIER CALL

${transcript.slice(0, 3000)}${transcript.length > 3000 ? "\n[transcript tronqué]" : ""}

PROCHAINES ÉTAPES IDENTIFIÉES

${nextStepsSection}

DESTINATAIRE

${contactEmail}

${missionInstructions}`;

  let raw: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock?.type === "text" ? textBlock.text : "";
  } catch (err) {
    console.error("[email-followup] Claude API call failed:", err);
    return null;
  }

  try {
    return validateAiShape<FollowUpEmail>("email-followup", "email_followup_prompt", JSON.parse(extractJsonObject(raw)), {
      subject: "nonEmptyString",
      body: "nonEmptyString",
    });
  } catch (err) {
    // Renvoyait auparavant `{ subject: "", body: raw }` : la réponse BRUTE du
    // modèle — prose, markdown, excuses — atterrissait dans le corps d'un
    // email de suivi prêt à partir au prospect. Un email absent est gênant ;
    // un email au contenu aberrant envoyé au client ne se rattrape pas.
    console.error(
      "[email-followup] réponse hors contrat, aucun email généré:",
      err instanceof Error ? err.message : String(err),
      `\nRaw Claude response:\n${raw.slice(0, 500)}`
    );
    return null;
  }
}
