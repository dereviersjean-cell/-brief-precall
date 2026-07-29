import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import type { CallObjection } from "./db";

export type ObjectionCategoryForClassifier = {
  id: string;
  label: string;
  description: string;
  handling_guidance: string;
  example_phrasings: string[];
};

export type HandlingQuality = "bien_traitee" | "partiellement" | "non_traitee";

export const HANDLING_QUALITY_LABELS: Record<HandlingQuality, string> = {
  bien_traitee: "Bien traitée",
  partiellement: "Partiellement traitée",
  non_traitee: "Non traitée",
};

export type ClassifiedObjection = {
  objection: string;
  response: string;
  // null = aucune catégorie du manager ne correspond → « Non classées » dans
  // l'UI. Un rattachement forcé vers la « moins pire » catégorie polluerait
  // les statistiques que le manager consulte, c'est le contraire du but.
  categoryId: string | null;
  handlingQuality: HandlingQuality | null;
  handlingComment: string | null;
  // true quand la note vient d'une comparaison au handling_guidance rempli
  // par le manager pour cette catégorie ; false quand elle vient d'une
  // appréciation générique (objection non classée, ou catégorie sans
  // consigne de traitement). L'UI distingue les deux.
  evaluatedAgainstPlaybook: boolean;
};

// Prompt codé en dur, PAS éditable dans admin_config — même raison que
// lib/key-points.ts et extractObjectionsFromTranscript : c'est une tâche
// d'extraction interne dont le contrat JSON est structurel, pas du contenu
// destiné au manager. Un prompt éditable ici rejouerait le bug #20.
const SYSTEM_PROMPT = `Tu es un analyste de calls commerciaux B2B en français.

On te donne (1) la liste des catégories d'objections définies par le directeur commercial, chacune avec sa définition et la manière attendue de la traiter, et (2) les objections réellement soulevées pendant un call, avec la réponse effectivement apportée par le commercial.

Pour CHAQUE objection, tu dois :

1. RATTACHEMENT — déterminer à quelle catégorie elle appartient, par le sens et non par les mots employés. « C'est trop cher », « on n'a pas le budget cette année » et « votre concurrent est moitié prix » relèvent d'intentions différentes : lis la définition de chaque catégorie avant de trancher. Renvoie le numéro de la catégorie. Si aucune catégorie ne correspond vraiment, renvoie null — ne force JAMAIS un rattachement approximatif.

2. ÉVALUATION — juger la réponse apportée par le commercial :
   - "bien_traitee" : la réponse suit la manière de traiter attendue et lève réellement l'objection.
   - "partiellement" : la réponse va dans la bonne direction mais reste incomplète, ou passe à côté d'un élément clé attendu.
   - "non_traitee" : aucune réponse, une esquive, un changement de sujet, ou une réponse qui ne traite pas l'objection.
   Quand la catégorie rattachée a une manière de traiter attendue, évalue PAR RAPPORT À ELLE et mets "compared_to_playbook": true. Sinon, évalue au jugement commercial général et mets "compared_to_playbook": false.

3. COMMENTAIRE — une phrase (25 mots max) qui dit concrètement ce qui a été bien fait ou ce qui manquait. Pas de généralité : cite l'élément précis.

Réponds UNIQUEMENT en JSON strict, sans markdown, avec exactement cette structure :
{"results": [{"index": 0, "category": 1, "quality": "bien_traitee", "comment": "...", "compared_to_playbook": true}]}

"index" est l'index de l'objection dans la liste fournie (à partir de 0), "category" le numéro de la catégorie ou null. Un objet par objection, dans l'ordre, aucun oubli.`;

type RawResult = {
  index?: number;
  category?: number | null;
  quality?: string;
  comment?: string;
  compared_to_playbook?: boolean;
};

function isHandlingQuality(value: unknown): value is HandlingQuality {
  return value === "bien_traitee" || value === "partiellement" || value === "non_traitee";
}

// Rattache chaque objection d'un call à une catégorie du manager et note la
// réponse apportée, en UN seul appel Claude pour tout le call (pas un par
// objection : le modèle voit la liste complète des catégories et l'ensemble
// des objections d'un même échange, ce qui donne de meilleurs rattachements
// qu'une suite de décisions isolées).
//
// Ne throw jamais : la classification est un enrichissement. En cas d'échec,
// les objections sont renvoyées non classées et restent indexées normalement
// dans la bibliothèque — exactement comme avant l'existence de ce module.
export async function classifyAndEvaluateObjections(
  categories: ObjectionCategoryForClassifier[],
  objections: CallObjection[]
): Promise<ClassifiedObjection[]> {
  const unclassified = (): ClassifiedObjection[] =>
    objections.map((o) => ({
      objection: o.objection,
      response: o.response,
      categoryId: null,
      handlingQuality: null,
      handlingComment: null,
      evaluatedAgainstPlaybook: false,
    }));

  // Aucune catégorie définie par le manager : rien à quoi rattacher, et rien
  // contre quoi évaluer. On ne consomme pas de tokens pour un résultat que
  // l'UI afficherait de toute façon comme « bibliothèque d'objections non
  // configurée ».
  if (categories.length === 0 || objections.length === 0) return unclassified();

  const categoryBlock = categories
    .map((c, i) => {
      const lines = [`${i + 1}. ${c.label}`];
      if (c.description.trim()) lines.push(`   Définition : ${c.description.trim()}`);
      if (c.handling_guidance.trim()) {
        lines.push(`   Manière de la traiter attendue : ${c.handling_guidance.trim()}`);
      } else {
        lines.push("   (aucune manière de la traiter définie par le manager pour cette catégorie)");
      }
      if (c.example_phrasings.length > 0) {
        lines.push(`   Formulations typiques : ${c.example_phrasings.map((p) => `« ${p} »`).join(", ")}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");

  const objectionBlock = objections
    .map((o, i) => `[${i}] Objection : ${o.objection}\n    Réponse du commercial : ${o.response}`)
    .join("\n\n");

  const userMessage = `Catégories d'objections définies par le directeur commercial :

${categoryBlock}

Objections soulevées pendant ce call :

${objectionBlock}`;

  let raw = "";
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock?.type === "text" ? textBlock.text : "";

    const parsed = JSON.parse(extractJsonObject(raw)) as { results?: RawResult[] };
    if (!Array.isArray(parsed.results)) {
      throw new Error("Réponse IA hors contrat (clé `results` absente ou non-tableau)");
    }

    const byIndex = new Map<number, RawResult>();
    for (const r of parsed.results) {
      if (typeof r.index === "number") byIndex.set(r.index, r);
    }

    return objections.map((o, i) => {
      const result = byIndex.get(i);
      // Numéro 1-indexé côté prompt → id réel. Un numéro hors bornes (modèle
      // qui invente une catégorie) retombe sur « non classée » plutôt que de
      // ranger l'objection au hasard.
      const categoryIndex = typeof result?.category === "number" ? result.category - 1 : -1;
      const category = categoryIndex >= 0 && categoryIndex < categories.length ? categories[categoryIndex] : null;
      const quality = isHandlingQuality(result?.quality) ? result.quality : null;
      const comment = typeof result?.comment === "string" && result.comment.trim() ? result.comment.trim() : null;

      // On ne prend pas le flag du modèle au mot : « comparé au playbook »
      // n'est vrai que si la catégorie retenue a effectivement une consigne
      // de traitement remplie côté manager.
      const evaluatedAgainstPlaybook =
        result?.compared_to_playbook === true && category !== null && category.handling_guidance.trim().length > 0;

      return {
        objection: o.objection,
        response: o.response,
        categoryId: category?.id ?? null,
        handlingQuality: quality,
        handlingComment: comment,
        evaluatedAgainstPlaybook,
      };
    });
  } catch (err) {
    console.error(
      "[objection-classifier] classifyAndEvaluateObjections failed (non-blocking):",
      err instanceof Error ? err.message : String(err),
      raw ? `\nRaw Claude response:\n${raw}` : "(no response captured — API call itself failed)"
    );
    return unclassified();
  }
}
