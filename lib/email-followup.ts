import Anthropic from "@anthropic-ai/sdk";
import { readPromptConfig, DEFAULT_EMAIL_FOLLOWUP_PROMPT } from "./admin-config";
import { extractJsonObject } from "./ai-json";

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
    return JSON.parse(extractJsonObject(raw)) as FollowUpEmail;
  } catch {
    console.log("[email-followup] JSON parse failed, raw:", raw.slice(0, 200));
    return { subject: "", body: raw };
  }
}
