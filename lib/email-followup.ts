import Anthropic from "@anthropic-ai/sdk";
import type { GmailMessage } from "./gmail";
import { readPromptConfig, DEFAULT_EMAIL_FOLLOWUP_PROMPT, DEFAULT_REPLY_SUGGESTION_PROMPT } from "./admin-config";

export type FollowUpEmail = {
  subject: string;
  body: string;
};

function formatEmailHistory(emails: GmailMessage[]): string {
  return emails
    .map(
      (e, i) =>
        `Email ${i + 1}\nFrom: ${e.from}\nTo: ${e.to}\nDate: ${e.date}\nSubject: ${e.subject}\n\n${e.body.slice(0, 500)}${e.body.length > 500 ? "…" : ""}`
    )
    .join("\n\n---\n\n");
}

export async function generateReplyToProspect(
  prospectReply: string,
  originalEmail: { subject: string; body: string },
  transcript?: string
): Promise<string | null> {
  const client = new Anthropic();

  const missionInstructions = (await readPromptConfig("reply_suggestion_prompt")) ?? DEFAULT_REPLY_SUGGESTION_PROMPT;

  const transcriptSection = transcript
    ? `\nCONTEXTE DU CALL INITIAL\n\n${transcript.slice(0, 2000)}${transcript.length > 2000 ? "\n[transcript tronqué]" : ""}\n`
    : "";

  const prompt = `Tu es un assistant commercial qui aide à rédiger des réponses à des emails de prospects.

EMAIL DE SUIVI ENVOYÉ AU PROSPECT

Sujet : ${originalEmail.subject}

${originalEmail.body}
${transcriptSection}
RÉPONSE DU PROSPECT

${prospectReply}

${missionInstructions}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    return textBlock?.type === "text" ? textBlock.text.trim() : null;
  } catch (err) {
    console.error("[email-followup] generateReplyToProspect Claude API failed:", err);
    return null;
  }
}

// Same shape as generateReplyToProspect but takes the chosen org email
// template's system_prompt directly instead of reading reply_suggestion_prompt
// from admin_config (sous-étape B of the Email Templates module).
// generateReplyToProspect itself is left untouched — it's still the
// rétrocompat path when no template is selected.
export async function generateReplyToProspectWithTemplate(
  prospectReply: string,
  originalEmail: { subject: string; body: string },
  systemPrompt: string,
  transcript?: string
): Promise<string | null> {
  const client = new Anthropic();

  const transcriptSection = transcript
    ? `\nCONTEXTE DU CALL INITIAL\n\n${transcript.slice(0, 2000)}${transcript.length > 2000 ? "\n[transcript tronqué]" : ""}\n`
    : "";

  const userMessage = `EMAIL DE SUIVI ENVOYÉ AU PROSPECT

Sujet : ${originalEmail.subject}

${originalEmail.body}
${transcriptSection}
RÉPONSE DU PROSPECT

${prospectReply}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    return textBlock?.type === "text" ? textBlock.text.trim() : null;
  } catch (err) {
    console.error("[email-followup] generateReplyToProspectWithTemplate Claude API failed:", err);
    return null;
  }
}

export async function generateFollowUpEmail(
  transcript: string,
  emailHistory: GmailMessage[],
  analysisNextSteps: string[],
  contactEmail: string
): Promise<FollowUpEmail | null> {
  const client = new Anthropic();

  const missionInstructions = (await readPromptConfig("email_followup_prompt")) ?? DEFAULT_EMAIL_FOLLOWUP_PROMPT;

  const historySection =
    emailHistory.length > 0
      ? `HISTORIQUE DES ÉCHANGES AVEC CE CONTACT\n\n${formatEmailHistory(emailHistory)}`
      : `HISTORIQUE DES ÉCHANGES AVEC CE CONTACT\n\nAucun échange email préalable avec ce contact. Utilise un ton professionnel et chaleureux par défaut.`;

  const nextStepsSection =
    analysisNextSteps.length > 0
      ? analysisNextSteps.map((s) => `- ${s}`).join("\n")
      : "Aucune prochaine étape identifiée — propose une prochaine étape pertinente basée sur le call.";

  const prompt = `Tu es un assistant commercial qui aide à rédiger des emails de suivi après un rendez-vous.

${historySection}

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

  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned) as FollowUpEmail;
  } catch {
    console.log("[email-followup] JSON parse failed, raw:", raw.slice(0, 200));
    return { subject: "", body: raw };
  }
}
