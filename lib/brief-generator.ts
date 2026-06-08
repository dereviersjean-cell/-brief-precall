import Anthropic from "@anthropic-ai/sdk";
import { AdminConfig } from "./admin-config";
import { enrichWithPappers } from "./pappers";

const client = new Anthropic();

const OVERVIEW_LENGTH: Record<AdminConfig["overviewLength"], string> = {
  court: "2 phrases",
  moyen: "2-3 phrases",
  long: "4-5 phrases",
};

const TONE_INSTRUCTION: Record<AdminConfig["tone"], string> = {
  formel: "Utilise un registre formel et soutenu.",
  professionnel: "Utilise un registre professionnel et accessible.",
  direct: "Sois direct et concis, va droit au but, évite le jargon.",
};

function extractJSON(raw: string): unknown {
  let text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text);
}

export type UserContext = {
  product_description: string | null;
  icp: string | null;
  sector: string | null;
} | null;

function buildUserPrompt(
  company: string,
  legalContext: string,
  config: AdminConfig,
  userContext: UserContext
): string {
  const overviewDesc = OVERVIEW_LENGTH[config.overviewLength];
  const toneDesc = TONE_INSTRUCTION[config.tone];

  const contextBlock =
    userContext &&
    (userContext.product_description || userContext.icp || userContext.sector)
      ? `\nContexte du commercial :\n${
          userContext.product_description
            ? `- Ce commercial vend : ${userContext.product_description}\n`
            : ""
        }${
          userContext.icp ? `- Sa cible : ${userContext.icp}\n` : ""
        }${
          userContext.sector ? `- Son secteur : ${userContext.sector}\n` : ""
        }`
      : "";

  return `Génère un brief pré-call complet pour un commercial B2B qui s'apprête à appeler ${company}.
${legalContext}${contextBlock}
${toneDesc}
Retourne ce JSON (structure stricte, aucun texte autour) :

{
  "overview": "Vue d'ensemble en ${overviewDesc} : secteur, modèle économique, taille et positionnement marché",
  "accroche": "Une seule phrase d'accroche percutante et personnalisée pour ouvrir le call — spécifique à l'actualité ou au contexte de l'entreprise",
  "pain_points": [
    { "title": "Nom court du pain point", "detail": "Description précise en 1-2 phrases" }
  ],
  "arguments": [
    { "title": "Titre de l'argument commercial", "detail": "Bénéfice concret chiffré si possible" }
  ],
  "vocabulaire": ["mot-clé-1", "mot-clé-2"]
}

Contraintes :
- Exactement ${config.painPointsCount} pain_points
- Exactement ${config.argumentsCount} arguments
- Exactement ${config.keywordsCount} mots-clés métier dans vocabulaire
- Tout en français
- Accroche basée sur un fait récent ou une réalité spécifique de ${company}${
    userContext?.product_description
      ? `\n- Les arguments doivent montrer comment "${userContext.product_description}" répond aux besoins de ${company}`
      : ""
  }`;
}

export async function generateBrief(
  company: string,
  config: AdminConfig,
  userContext: UserContext = null
): Promise<unknown> {
  const pappersData = await enrichWithPappers(company);
  const legalContext = pappersData
    ? `\nVoici les données légales officielles de l'entreprise (source : registre français officiel) :\n${JSON.stringify(pappersData, null, 2)}\n\nBase-toi sur ces faits réels pour le brief. Ne les contredis pas.\n`
    : "";

  const message = await client.messages.create({
    model: config.model,
    max_tokens: 1024,
    system: config.systemPrompt,
    messages: [{ role: "user", content: buildUserPrompt(company, legalContext, config, userContext) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Réponse inattendue de l'API.");
  }

  try {
    return extractJSON(textBlock.text);
  } catch {
    console.error("[brief-generator] Échec du parsing JSON :\n", textBlock.text);
    throw new Error("Le modèle n'a pas retourné du JSON valide.");
  }
}
