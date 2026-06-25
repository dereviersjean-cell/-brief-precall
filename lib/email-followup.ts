import Anthropic from "@anthropic-ai/sdk";
import type { GmailMessage } from "./gmail";

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

export async function generateFollowUpEmail(
  transcript: string,
  emailHistory: GmailMessage[],
  analysisNextSteps: string[],
  contactEmail: string
): Promise<FollowUpEmail> {
  const client = new Anthropic();

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

TA MISSION

Rédige un email de suivi à envoyer à ${contactEmail} qui :
- Reprend le ton, le niveau de formalité et le style de signature observés dans l'historique des échanges (s'il y en a — sinon utilise un ton professionnel et chaleureux par défaut)
- Mentionne brièvement 1-2 points clés discutés pendant le call
- Propose clairement la prochaine étape identifiée
- Reste concis (5-8 lignes maximum)

FORMAT DE SORTIE

Réponds uniquement en JSON valide, sur une seule ligne, sans markdown :
{"subject":"","body":""}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : "";
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(cleaned) as FollowUpEmail;
  } catch {
    console.log("[email-followup] JSON parse failed, raw:", raw.slice(0, 200));
    return { subject: "", body: raw };
  }
}
