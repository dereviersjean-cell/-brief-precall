import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import { MEETING_STAGE_LABELS } from "./meeting-stage";
import { findSimilarObjections } from "./objections";
import type { TrainingDebrief, TrainingPersona, TrainingScenario, TrainingTurn } from "./db";

// Moteur du bloc Entraînement : Claude joue un prospect qui défend une
// objection réelle (extraite des calls du commercial), le commercial
// s'entraîne à y répondre, puis un débrief noté est généré. Prompts codés en
// dur (pas admin_config) : contenu interne au produit, pas éditable manager
// — même logique que lib/key-points.ts.

// Axes de notation fixes du débrief — indépendants du playbook (les
// dimensions du playbook évaluent un call entier, pas un drill d'objection).
export const TRAINING_AXES: { key: string; label: string }[] = [
  { key: "traitement", label: "Traitement de l'objection" },
  { key: "ecoute", label: "Écoute & questions" },
  { key: "clarte", label: "Clarté & concision" },
  { key: "next_step", label: "Prochaine étape" },
];

// Nombre max de répliques du commercial par session — au-delà, l'UI force le
// débrief (une vraie passe d'objection ne dure pas 30 tours).
export const MAX_COMMERCIAL_TURNS = 12;

const DEFAULT_PERSONA: TrainingPersona = {
  name: "Claire Morin",
  role: "Directrice générale",
  company: "PME française (secteur services)",
  attitude: "Cordiale mais pressée — elle a déjà un avis et peu de temps.",
};

// Persona générée par Haiku à la création de session (un seul petit appel).
// Ne bloque jamais le démarrage : toute erreur retombe sur DEFAULT_PERSONA.
export async function generatePersona(
  objection: string,
  companyName: string | null,
  meetingStageLabel: string | null
): Promise<TrainingPersona> {
  const client = new Anthropic();
  let raw = "";
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: `Tu génères le persona d'un prospect B2B français pour un exercice de roleplay commercial. Le prospect soulèvera cette objection pendant l'exercice. Invente un persona crédible et spécifique (jamais de nom générique type "Jean Dupont").

Réponds UNIQUEMENT en JSON strict, sans markdown :
{ "name": "prénom nom", "role": "fonction", "company": "description courte de l'entreprise (secteur, taille)", "attitude": "trait de caractère + posture dans la conversation, 1 phrase" }`,
      messages: [
        {
          role: "user",
          content: `Objection à défendre : « ${objection} »${companyName ? `\nEntreprise réelle d'origine (à ne PAS reprendre telle quelle, invente une entreprise similaire) : ${companyName}` : ""}${meetingStageLabel ? `\nÉtape du cycle de vente : ${meetingStageLabel}` : ""}`,
        },
      ],
    });
    const block = message.content.find((b) => b.type === "text");
    raw = block?.type === "text" ? block.text : "";
    const parsed = JSON.parse(extractJsonObject(raw)) as Partial<TrainingPersona>;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.role === "string" &&
      typeof parsed.company === "string" &&
      typeof parsed.attitude === "string"
    ) {
      return { name: parsed.name, role: parsed.role, company: parsed.company, attitude: parsed.attitude };
    }
    return DEFAULT_PERSONA;
  } catch (err) {
    console.error("[training] generatePersona failed (fallback to default):", err instanceof Error ? err.message : String(err), raw ? `\nRaw: ${raw}` : "");
    return DEFAULT_PERSONA;
  }
}

function prospectSystemPrompt(scenario: TrainingScenario): string {
  const stageLabel = scenario.meetingStage ? MEETING_STAGE_LABELS[scenario.meetingStage] : null;
  return `Tu joues un prospect B2B dans un exercice d'entraînement commercial. Reste STRICTEMENT dans ton rôle du début à la fin.

Ton personnage :
- ${scenario.persona.name}, ${scenario.persona.role} — ${scenario.persona.company}
- Attitude : ${scenario.persona.attitude}
${stageLabel ? `- Contexte : vous êtes en ${stageLabel}` : ""}

Ton objection centrale (celle que le commercial doit apprendre à traiter) :
« ${scenario.objection} »

Règles :
- Registre ORAL : répliques courtes (1 à 3 phrases), naturelles, comme au téléphone. Jamais de listes ni de markdown.
- Défends ton objection avec conviction. Ne cède JAMAIS à la première réponse.
- Cède progressivement UNIQUEMENT si le commercial est bon : il reformule ton objection, pose des questions pour comprendre, apporte des preuves concrètes (chiffres, références), propose une étape suivante précise.
- S'il répond mal (vague, monologue produit, ignore ton objection, promet sans preuve), durcis ta position ou ajoute UNE sous-objection réaliste liée à la principale.
- Si le commercial est convaincant sur plusieurs répliques d'affilée, accepte d'avancer (par exemple accepter un rendez-vous ou une prochaine étape) — l'exercice a alors atteint son but.
- Ne sors JAMAIS du rôle : pas de conseils, pas de commentaires sur l'exercice, pas de méta. Tu es le prospect, rien d'autre.`;
}

// Première réplique du prospect — pose le contexte et amène l'objection.
export async function generateOpeningLine(scenario: TrainingScenario): Promise<string> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: prospectSystemPrompt(scenario),
    messages: [
      {
        role: "user",
        content:
          "(Début de l'exercice — ouvre la conversation en 2-3 phrases : salue brièvement, pose ton contexte, et amène ton objection naturellement.)",
      },
    ],
  });
  const block = message.content.find((b) => b.type === "text");
  const text = block?.type === "text" ? block.text.trim() : "";
  if (!text) throw new Error("Réponse vide du prospect IA");
  return text;
}

// Réplique suivante du prospect, à partir du transcript complet.
export async function generateProspectReply(scenario: TrainingScenario, transcript: TrainingTurn[]): Promise<string> {
  const client = new Anthropic();

  // Le transcript alterne prospect/commercial ; côté API le prospect est
  // l'assistant. Le premier tour prospect (opening) est reproduit via un
  // user-turn d'amorce pour garder l'alternance user/assistant valide.
  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: "(Début de l'exercice — ouvre la conversation.)" },
  ];
  for (const turn of transcript) {
    messages.push({ role: turn.role === "prospect" ? "assistant" : "user", content: turn.text });
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: prospectSystemPrompt(scenario),
    messages,
  });
  const block = message.content.find((b) => b.type === "text");
  const text = block?.type === "text" ? block.text.trim() : "";
  if (!text) throw new Error("Réponse vide du prospect IA");
  return text;
}

// Garde-fou façon validateCallAnalysisShape (bug #20) : le débrief est du
// JSON généré — on vérifie la forme au runtime plutôt que de laisser passer
// des champs null silencieux.
export function validateTrainingDebriefShape(parsed: unknown): TrainingDebrief {
  const obj = parsed as Record<string, unknown>;
  const missing: string[] = [];
  if (typeof obj?.global_score !== "number") missing.push("global_score");
  if (obj?.objection_handled !== "oui" && obj?.objection_handled !== "partiellement" && obj?.objection_handled !== "non") {
    missing.push("objection_handled");
  }
  if (!Array.isArray(obj?.axes) || (obj.axes as unknown[]).length === 0) missing.push("axes");
  if (!Array.isArray(obj?.strengths)) missing.push("strengths");
  if (!Array.isArray(obj?.weaknesses)) missing.push("weaknesses");
  if (typeof obj?.better_response !== "string") missing.push("better_response");
  if (missing.length > 0) {
    throw new Error(`Débrief IA hors contrat (clés manquantes/invalides : ${missing.join(", ")})`);
  }
  return obj as TrainingDebrief;
}

export async function generateTrainingDebrief(
  organizationId: string | null,
  scenario: TrainingScenario,
  transcript: TrainingTurn[]
): Promise<TrainingDebrief> {
  const client = new Anthropic();

  // Réponses gagnantes de l'équipe sur des objections similaires — contexte
  // best-effort pour ancrer better_response dans ce qui marche vraiment.
  let winningExamples = "";
  if (organizationId) {
    try {
      const similar = await findSimilarObjections(organizationId, scenario.objection);
      const examples = similar
        .slice(0, 3)
        .map((s) => `- Objection : « ${s.objection} » — Réponse apportée : ${s.response}`)
        .join("\n");
      if (examples) winningExamples = `\n\nRéponses déjà apportées par l'équipe sur des objections similaires (à exploiter si pertinentes) :\n${examples}`;
    } catch {
      // sans exemples — le débrief reste valable
    }
  }

  const axesList = TRAINING_AXES.map((a) => `"${a.key}" (${a.label})`).join(", ");
  const transcriptText = transcript
    .map((t) => `${t.role === "prospect" ? "PROSPECT" : "COMMERCIAL"} : ${t.text}`)
    .join("\n");

  const systemPrompt = `Tu es un coach commercial B2B exigeant mais bienveillant. Tu débriefes un exercice de roleplay : un commercial s'est entraîné à traiter une objection face à un prospect IA. Évalue UNIQUEMENT les répliques du COMMERCIAL.

Notation : chaque axe de 1 à 5 (nombres décimaux autorisés), global_score = moyenne cohérente des axes. Sois exigeant : 5/5 = irréprochable.

Réponds UNIQUEMENT en JSON strict, sans markdown, avec exactement cette structure :
{
  "global_score": number,
  "objection_handled": "oui" | "partiellement" | "non",
  "axes": [{ "key": string, "label": string, "score": number, "comment": string }],
  "strengths": [string],
  "weaknesses": [string],
  "better_response": string
}

Les axes à évaluer (tous, exactement ces keys) : ${axesList}.
"better_response" : la meilleure réponse possible à l'objection dans ce contexte, formulée à l'oral (3-5 phrases), que le commercial peut réutiliser telle quelle.
"strengths"/"weaknesses" : 2 à 4 puces chacun, concrètes, citant si utile les mots du commercial.`;

  const userMessage = `Objection travaillée : « ${scenario.objection} »${scenario.originalResponse ? `\nRéponse d'origine en call réel : ${scenario.originalResponse}` : ""}${scenario.meetingStage ? `\nÉtape du cycle : ${MEETING_STAGE_LABELS[scenario.meetingStage]}` : ""}${winningExamples}

Transcript de l'exercice :
${transcriptText}`;

  let raw = "";
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = message.content.find((b) => b.type === "text");
    raw = block?.type === "text" ? block.text : "";
    return validateTrainingDebriefShape(JSON.parse(extractJsonObject(raw)));
  } catch (err) {
    console.error(
      "[training] generateTrainingDebrief failed:",
      err instanceof Error ? err.message : String(err),
      raw ? `\nRaw Claude response:\n${raw}` : "(no response captured)"
    );
    throw err;
  }
}
