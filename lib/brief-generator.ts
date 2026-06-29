import Anthropic from "@anthropic-ai/sdk";
import { AdminConfig } from "./admin-config";
import type { NewsArticle } from "./news";
import { findSimilarReferences, SimilarReference } from "./embeddings";
import { getContact } from "./db";

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
  newsContext: string,
  config: AdminConfig,
  userContext: UserContext,
  similarRefs: SimilarReference[] = [],
  relationalHistoryBlock = ""
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
        }${userContext.icp ? `- Sa cible : ${userContext.icp}\n` : ""}${
          userContext.sector ? `- Son secteur : ${userContext.sector}\n` : ""
        }`
      : "";

  const referencesBlock =
    similarRefs.length > 0
      ? `\nRéférences clients similaires dans votre portfolio :\n${similarRefs
          .map(
            (r) =>
              `- ${r.client_name ?? "Client"} (${[r.sector, r.company_size].filter(Boolean).join(", ")}) — Problème : ${r.problem ?? "–"} — Solution : ${r.solution ?? "–"} — Résultat : ${r.result ?? "–"}`
          )
          .join(
            "\n"
          )}\n\nVoici les références clients les plus pertinentes pour ce prospect. Pour chacune génère un bloc avec : pourquoi cette référence est pertinente pour ce prospect spécifiquement, et une formulation exacte prête à dire à l'oral avec contexte et chiffres.`
      : "";

  const referencesSchema =
    similarRefs.length > 0
      ? `  "references": [\n    { "client_name": "...", "relevance": "Pourquoi pertinent pour ce prospect", "pitch": "Formulation prête à l'oral avec chiffres" }\n  ],\n`
      : "";

  const referencesConstraint =
    similarRefs.length > 0
      ? `\n- Pour chaque référence dans "references" : explique en 1 phrase pourquoi c'est pertinent pour ${company}, puis rédige une formulation exacte prête à l'oral avec le nom du client, le contexte et les chiffres clés`
      : "";

  const actualitesSchema = newsContext
    ? `  "actualites": [\n    { "titre": "...", "description": "...", "url": "...", "source": "...", "date": "..." }\n  ],\n`
    : "";

  const actualitesConstraint = newsContext
    ? `\n- Sélectionne les 3 actualités les plus pertinentes parmi celles fournies et retourne-les dans "actualites" en copiant exactement les valeurs titre, description, url, source et date`
    : "";

  const relationalSchema = relationalHistoryBlock
    ? `  "historique_relationnel": "Synthèse courte de ce qu'il faut retenir de l'historique pour ce nouveau call",\n`
    : "";

  const relationalConstraint = relationalHistoryBlock
    ? `\n- Remplis "historique_relationnel" avec une synthèse de 1-2 phrases de ce qu'il faut retenir de l'historique pour aborder ce nouveau call`
    : "";

  return `Génère un brief pré-call complet pour un commercial B2B qui s'apprête à appeler ${company}.
${legalContext}${newsContext}${contextBlock}${referencesBlock}${relationalHistoryBlock}
${toneDesc}
Retourne ce JSON (structure stricte, aucun texte autour). Même si tu as utilisé la recherche web, ta réponse finale doit être UNIQUEMENT le JSON ci-dessous, sans phrase d'introduction, citation, ni texte additionnel :

{
  "overview": "Vue d'ensemble en ${overviewDesc} : secteur, modèle économique, taille et positionnement marché",
  "accroche": "Une seule phrase d'accroche percutante et personnalisée pour ouvrir le call — spécifique à l'actualité ou au contexte de l'entreprise",
  "pain_points": [
    { "title": "Nom court du pain point", "detail": "Description précise en 1-2 phrases" }
  ],
  "arguments": [
    { "title": "Titre de l'argument commercial", "detail": "Bénéfice concret chiffré si possible" }
  ],
  "vocabulaire": ["mot-clé-1", "mot-clé-2"],
${referencesSchema}${actualitesSchema}${relationalSchema}}

Contraintes :
- Exactement ${config.painPointsCount} pain_points
- Exactement ${config.argumentsCount} arguments
- Exactement ${config.keywordsCount} mots-clés métier dans vocabulaire
- Tout en français
- Accroche basée sur un fait récent ou une réalité spécifique de ${company}${
    userContext?.product_description
      ? `\n- Les arguments doivent montrer comment "${userContext.product_description}" répond aux besoins de ${company}`
      : ""
  }${referencesConstraint}${actualitesConstraint}${relationalConstraint}`;
}

export async function generateBrief(
  company: string,
  config: AdminConfig,
  userContext: UserContext = null,
  pappersData?: unknown,
  newsArticles?: NewsArticle[],
  userId?: string,
  contactEmail?: string | null
): Promise<unknown> {
  const legalContext = pappersData
    ? `\nVoici les données légales officielles de l'entreprise (source : registre français officiel) :\n${JSON.stringify(pappersData, null, 2)}\n\nBase-toi sur ces faits réels pour le brief. Ne les contredis pas.\n`
    : "";

  const newsContext =
    newsArticles && newsArticles.length > 0
      ? `\nActualités récentes sur l'entreprise (90 derniers jours) :\n${newsArticles
          .map(
            (a, i) =>
              `${i + 1}. [${a.source}] ${a.titre} — ${a.description}${a.date ? ` (${a.date.slice(0, 10)})` : ""} — ${a.url}`
          )
          .join("\n")}\n`
      : "";

  let similarRefs: SimilarReference[] = [];
  if (userId) {
    try {
      const sectorFromPappers =
        (pappersData as Record<string, unknown>)?.libelle_code_naf ??
        (pappersData as Record<string, unknown>)?.code_naf ??
        "";
      const prospectContext = [company, sectorFromPappers, userContext?.sector]
        .filter(Boolean)
        .join(" ");
      similarRefs = await findSimilarReferences(userId, prospectContext);
    } catch (err) {
      console.warn("[brief-generator] findSimilarReferences failed:", err);
    }
  }

  let relationalHistoryBlock = "";
  if (userId && contactEmail) {
    try {
      const contact = await getContact(userId, contactEmail);
      if (contact && contact.total_calls > 0 && contact.last_call_summary) {
        relationalHistoryBlock = `\n# HISTORIQUE RELATIONNEL AVEC CE CONTACT\n\nVous avez déjà eu ${contact.total_calls} échange(s) avec ce contact. Voici un résumé de votre dernier call :\n\n${contact.last_call_summary}\n\nUtilise cet historique pour enrichir le brief — mentionne les engagements pris précédemment, le contexte déjà établi, et adapte l'approche en conséquence. Ajoute un champ "historique_relationnel" dans le JSON de sortie avec une synthèse courte de ce qu'il faut retenir de cet historique pour ce nouveau call.\n`;
      }
    } catch (err) {
      console.warn("[brief-generator] getContact failed:", err);
    }
  }

  const message = await client.messages.create({
    model: config.model,
    max_tokens: 6000,
    system: config.systemPrompt,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
    messages: [
      {
        role: "user",
        content: buildUserPrompt(
          company,
          legalContext,
          newsContext,
          config,
          userContext,
          similarRefs,
          relationalHistoryBlock
        ),
      },
    ],
  });

  const textBlock = message.content.filter((b) => b.type === "text").pop();
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
