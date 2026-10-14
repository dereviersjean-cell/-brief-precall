import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import { reportWarning } from "./monitoring";

// Pré-remplissage du profil à l'inscription (14/10/2026, demande de Jean) :
// à partir du nom de l'entreprise et de son site, Brief propose ce qu'elle
// vend, à qui, son secteur et sa promesse. L'utilisateur confirme ou corrige
// chaque réponse : c'est une proposition, jamais une donnée enregistrée sans
// qu'il l'ait vue. Disponible seulement après la vérification de l'adresse
// (la route exige une session, qui n'existe qu'après le code).
//
// Prompt codé en dur (contrat JSON structurel, pas du contenu manager — même
// règle que le classifieur d'objections).

const client = new Anthropic();
const MODEL = "claude-sonnet-5-5";
const FALLBACK_MODEL = "claude-sonnet-4-6";
const MAX_PAUSE_RESUMES = 2;

export const PREFILL_SECTORS = ["SaaS B2B", "Industrie", "BTP", "Finance", "RH", "Marketing", "Autre"] as const;

export type OnboardingPrefill = {
  found: boolean;
  whatYouSell: string;
  icp: string;
  sector: string;
  valueProposition: string;
};

const SYSTEM = `Tu aides un commercial B2B qui vient de créer son compte sur Brief, un outil qui prépare ses rendez-vous de prospection.
À partir du nom de SON entreprise (et de son site s'il est fourni), cherche sur le web ce qu'elle vend et à qui, puis propose son profil commercial.

Réponds UNIQUEMENT par un objet JSON, sans texte autour :
{"found": true|false, "what_you_sell": "...", "icp": "...", "sector": "...", "value_proposition": "..."}

Règles :
- what_you_sell : une ou deux phrases, en français, comme l'entreprise se présenterait à un prospect (le produit ou service, pour qui).
- icp : le client idéal en une phrase — fonction du décideur, type et taille d'entreprise, secteur. Ex. « Directeurs commerciaux de PME industrielles de 20 à 200 salariés ».
- sector : le secteur DES CLIENTS visés, parmi exactement : SaaS B2B, Industrie, BTP, Finance, RH, Marketing, Autre.
- value_proposition : la promesse en une phrase courte, concrète, sans superlatifs.
- Appuie-toi uniquement sur ce que tu trouves. Si tu ne trouves pas l'entreprise avec certitude (homonymes, rien de probant), réponds found=false et laisse les autres champs vides : une proposition inventée serait pire que rien.`;

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function ask(model: string, prompt: string): Promise<Anthropic.Message> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let message: Anthropic.Message | null = null;
  for (let attempt = 0; attempt <= MAX_PAUSE_RESUMES; attempt++) {
    message = await client.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      ...(model === MODEL ? { output_config: { effort: "low" } } : {}),
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 2 }],
      messages,
    } as Anthropic.MessageCreateParamsNonStreaming);
    console.log(
      `[onboarding-prefill] ${message.model} stop=${message.stop_reason} in=${message.usage.input_tokens} out=${message.usage.output_tokens} searches=${message.usage.server_tool_use?.web_search_requests ?? 0}`
    );
    if (message.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: message.content });
  }
  return message as Anthropic.Message;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function generateOnboardingPrefill(params: { companyName: string; website: string | null }): Promise<OnboardingPrefill> {
  const prompt = `Entreprise : ${params.companyName}${params.website ? `\nSite web : ${params.website}` : ""}`;
  let message = await ask(MODEL, prompt);
  if (message.stop_reason === "refusal") {
    reportWarning("onboarding-prefill.refusal", `Refus du modèle pour « ${params.companyName} »`);
    message = await ask(FALLBACK_MODEL, prompt);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(extractJsonObject(textOf(message))) as Record<string, unknown>;
  } catch {
    reportWarning("onboarding-prefill.json", `Réponse illisible pour « ${params.companyName} »`, { raw: textOf(message).slice(0, 1000) });
    return { found: false, whatYouSell: "", icp: "", sector: "", valueProposition: "" };
  }

  const sector = clean(parsed.sector, 40);
  const result: OnboardingPrefill = {
    found: parsed.found === true,
    whatYouSell: clean(parsed.what_you_sell, 400),
    icp: clean(parsed.icp, 300),
    sector: (PREFILL_SECTORS as readonly string[]).includes(sector) ? sector : "",
    valueProposition: clean(parsed.value_proposition, 300),
  };
  // « Trouvé » sans rien d'utilisable ne vaut pas mieux qu'« introuvable ».
  if (!result.whatYouSell && !result.icp) result.found = false;
  return result.found ? result : { found: false, whatYouSell: "", icp: "", sector: "", valueProposition: "" };
}
