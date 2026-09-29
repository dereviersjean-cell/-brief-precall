import Anthropic from "@anthropic-ai/sdk";
import { readPromptConfig, DEFAULT_EMAIL_FOLLOWUP_PROMPT } from "./admin-config";
import { extractJsonObject } from "./ai-json";
import { validateAiShape } from "./ai-shape";
import { getUserName, getUserProfile } from "./db";
import { firstNameFromEmail } from "./email-address";
import type { TranscriptJson } from "./recall";

export type FollowUpEmail = {
  subject: string;
  body: string;
};

export type FollowUpInput = {
  transcript: string;
  // Tours de parole et noms relevés en visio : le transcript texte porte
  // souvent « Unknown: » à chaque ligne, et le modèle inventait alors le nom
  // du prospect (« Alexandre » pour André Ravachol, 29/09/2026).
  transcriptJson?: TranscriptJson | null;
  speakerNames?: Record<string, string> | null;
  // Résumé et points clés de l'analyse : ce qui compte dans le call, déjà
  // dégagé. Le transcript entier suit, pour les formulations et les détails.
  summary?: string | null;
  keyPoints?: string | null;
  nextSteps: string[];
  contactEmail: string;
  // Entreprise du prospect quand on la connaît (calls.prospect_company, ou le
  // nom d'entreprise du rendez-vous) : sans elle, le modèle écrivait
  // « Oliverlist x [votre société] » dans l'objet.
  prospectCompany?: string | null;
  // Le commercial au nom de qui l'email est écrit (users.id).
  senderUserId?: string | null;
};

// « skipped » : le call ne contient pas d'échange commercial exploitable (test,
// call coupé, discussion interne) — mieux vaut pas d'email qu'un email qui
// parle de transcription ou invente un contenu. « error » : génération ratée.
export type FollowUpResult = { status: "ok"; email: FollowUpEmail } | { status: "skipped" } | { status: "error" };

// generateReplyToProspect / generateReplyToProspectWithTemplate ("suggest a
// reply to what the prospect just wrote") were removed 25/07/2026 along with
// gmail.readonly — that feature genuinely needed the prospect's email body,
// which the app can no longer read (see lib/gmail.ts).

// Le transcript est envoyé en entier : l'ancienne coupe à 3 000 caractères ne
// montrait que les cinq premières minutes du call. Plafond de sécurité très
// au-dessus d'un rendez-vous d'une heure (~60 000 caractères).
const MAX_TRANSCRIPT_CHARS = 150_000;

// Un champ à compléter entre crochets (« [votre société] », « [Prénom] ») ne
// doit jamais partir chez un prospect.
const PLACEHOLDER_RE = /\[[^\]\n]{2,40}\]/;

async function describeSender(userId: string | null | undefined): Promise<string> {
  if (!userId) return "";
  const [name, profile] = await Promise.all([
    getUserName(userId).catch(() => null),
    getUserProfile(userId).catch(() => null),
  ]);
  const company = profile?.company_name?.trim();
  if (!name && !company) return "";
  return `Expéditeur : ${[name, company].filter(Boolean).join(", ")}. Signe avec son prénom.`;
}

// Contrat imposé par le code : ce qui ne doit jamais dépendre du prompt
// éditable en admin (règle « contrat JSON forcé côté serveur »).
function contractPrompt(sender: string): string {
  return `Tu écris au nom du commercial, à la première personne, l'email qu'il enverra au prospect après leur rendez-vous.${sender ? `\n${sender}` : ""}

Tiens-toi à ce qui a été dit pendant le rendez-vous : aucun chiffre, aucune date, aucun engagement qui n'y figure pas.
L'email part tel quel chez le prospect : il ne mentionne jamais d'enregistrement, de transcription, d'analyse ni d'outil, et ne contient aucun champ à compléter entre crochets. Si une information manque, écris la phrase sans elle.
Salue le destinataire par le prénom qui correspond à son adresse email ; les noms du transcript peuvent être mal retranscrits. Sans prénom sûr, écris simplement « Bonjour, ».
Si le rendez-vous ne contient pas d'échange commercial exploitable (test, call coupé, discussion interne), renvoie {"subject":"","body":""} : aucun email ne sera proposé.

Réponds uniquement par un objet JSON {"subject":"...","body":"..."}, sans texte autour ; dans "body", les retours à la ligne s'écrivent \\n.`;
}

export async function generateFollowUpEmail(input: FollowUpInput): Promise<FollowUpResult> {
  const client = new Anthropic();

  const [styleInstructions, sender] = await Promise.all([
    readPromptConfig("email_followup_prompt").then((p) => p ?? DEFAULT_EMAIL_FOLLOWUP_PROMPT),
    describeSender(input.senderUserId),
  ]);

  const nextStepsSection =
    input.nextSteps.length > 0
      ? input.nextSteps.map((s) => `- ${s}`).join("\n")
      : "Aucune prochaine étape identifiée : propose-en une qui découle du rendez-vous.";

  const names = input.speakerNames ?? {};
  const fullTranscript =
    input.transcriptJson && input.transcriptJson.turns.length > 0
      ? input.transcriptJson.turns.map((t) => `${names[t.speaker_id] || t.speaker_name_raw || t.speaker_id}: ${t.text}`).join("\n")
      : input.transcript;
  const transcript =
    fullTranscript.length > MAX_TRANSCRIPT_CHARS
      ? `${fullTranscript.slice(0, MAX_TRANSCRIPT_CHARS)}\n[transcript tronqué]`
      : fullTranscript;

  const firstName = firstNameFromEmail(input.contactEmail);
  const userMessage = [
    `DESTINATAIRE\n\n${input.contactEmail}${firstName ? `\nPrénom : ${firstName}` : ""}${
      input.prospectCompany?.trim() ? `\nEntreprise : ${input.prospectCompany.trim()}` : ""
    }`,
    input.summary?.trim() ? `RÉSUMÉ DU RENDEZ-VOUS\n\n${input.summary.trim()}` : null,
    input.keyPoints?.trim() ? `POINTS CLÉS\n\n${input.keyPoints.trim()}` : null,
    `PROCHAINES ÉTAPES IDENTIFIÉES\n\n${nextStepsSection}`,
    `TRANSCRIPT COMPLET\n\n${transcript}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Deux essais au plus : le second seulement si le premier contient un champ
  // à compléter entre crochets.
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await requestFollowUp(client, `${contractPrompt(sender)}\n\n${styleInstructions}`, userMessage);
    if (result.status !== "ok") return result;
    const hasPlaceholder = PLACEHOLDER_RE.test(result.email.subject) || PLACEHOLDER_RE.test(result.email.body);
    if (!hasPlaceholder) return result;
    console.warn(`[email-followup] champ à compléter dans l'email (essai ${attempt + 1}) — ${attempt === 0 ? "nouvel essai" : "aucun email proposé"}`);
  }
  return { status: "error" };
}

// Sonnet 5.5 à effort low : comparé à Sonnet 4.6 sur 5 vrais calls le
// 29/09/2026, il respecte le registre du call (tu/vous) et la consigne sans
// puces, et reste deux fois plus rapide. Refus → même demande sur 4.6.
const FOLLOW_UP_MODEL: string = "claude-sonnet-5-5";
const FALLBACK_MODEL: string = "claude-sonnet-4-6";

async function callModel(client: Anthropic, model: string, system: string, userMessage: string): Promise<Anthropic.Message> {
  const thinking = model !== FALLBACK_MODEL;
  return client.messages.create({
    model,
    // Sur Sonnet 5.5 la réflexion compte dans max_tokens.
    max_tokens: thinking ? 16000 : 1500,
    ...(thinking ? { output_config: { effort: "low" as const } } : {}),
    system,
    messages: [{ role: "user", content: userMessage }],
  });
}

async function requestFollowUp(client: Anthropic, system: string, userMessage: string): Promise<FollowUpResult> {
  let raw: string;
  try {
    let message = await callModel(client, FOLLOW_UP_MODEL, system, userMessage);
    if (message.stop_reason === "refusal" && FOLLOW_UP_MODEL !== FALLBACK_MODEL) {
      console.warn(`[email-followup] refus de ${FOLLOW_UP_MODEL}, nouvel essai sur ${FALLBACK_MODEL}`);
      message = await callModel(client, FALLBACK_MODEL, system, userMessage);
    }
    const textBlock = message.content.filter((b) => b.type === "text").pop();
    raw = textBlock?.type === "text" ? textBlock.text : "";
  } catch (err) {
    console.error("[email-followup] Claude API call failed:", err);
    return { status: "error" };
  }

  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as Partial<FollowUpEmail>;
    if (!parsed.subject?.trim() && !parsed.body?.trim()) return { status: "skipped" };
    const email = validateAiShape<FollowUpEmail>("email-followup", "email_followup_prompt", parsed, {
      subject: "nonEmptyString",
      body: "nonEmptyString",
    });
    return { status: "ok", email };
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
    return { status: "error" };
  }
}
