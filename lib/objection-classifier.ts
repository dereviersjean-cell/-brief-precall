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
  // Résumés produits par l'extraction d'analyzeCall (troisième personne).
  objection: string;
  response: string;
  // Phrases réellement prononcées, copiées mot à mot du transcript et
  // VÉRIFIÉES contre lui (voir findVerbatim). null = introuvable, l'UI
  // retombe alors sur le résumé ci-dessus en le disant.
  prospectVerbatim: string | null;
  commercialVerbatim: string | null;
  // Ce qu'il aurait fallu répondre, dérivé du handling_guidance de la
  // catégorie. null quand l'objection a été bien traitée.
  suggestedResponse: string | null;
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

On te donne (1) la liste des catégories d'objections définies par le directeur commercial, chacune avec sa définition et la manière attendue de la traiter, (2) les objections réellement soulevées pendant un call sous forme de résumé, avec la réponse apportée par le commercial, et (3) le transcript complet du call.

Pour CHAQUE objection, tu dois :

1. RATTACHEMENT — déterminer à quelle catégorie elle appartient, par le sens et non par les mots employés. « C'est trop cher », « on n'a pas le budget cette année » et « votre concurrent est moitié prix » relèvent d'intentions différentes : lis la définition de chaque catégorie avant de trancher. Renvoie le numéro de la catégorie. Si aucune catégorie ne correspond vraiment, renvoie null — ne force JAMAIS un rattachement approximatif.

2. ÉVALUATION — juger la réponse apportée par le commercial :
   - "bien_traitee" : la réponse suit la manière de traiter attendue et lève réellement l'objection.
   - "partiellement" : la réponse va dans la bonne direction mais reste incomplète, ou passe à côté d'un élément clé attendu.
   - "non_traitee" : aucune réponse, une esquive, un changement de sujet, ou une réponse qui ne traite pas l'objection.
   Quand la catégorie rattachée a une manière de traiter attendue, évalue PAR RAPPORT À ELLE et mets "compared_to_playbook": true. Sinon, évalue au jugement commercial général et mets "compared_to_playbook": false.

3. COMMENTAIRE — une phrase (25 mots max) qui dit concrètement ce qui a été bien fait ou ce qui manquait. Pas de généralité : cite l'élément précis.

4. VERBATIM — retrouve dans le transcript les phrases RÉELLEMENT PRONONCÉES :
   - "prospect_verbatim" : le passage où le prospect soulève cette objection.
   - "commercial_verbatim" : le passage où le commercial y répond.
   Règles absolues sur ces deux champs :
   - COPIE MOT À MOT depuis le transcript. Ne reformule pas, ne corrige pas la grammaire, ne résume pas, ne traduis pas. Recopie les hésitations et les répétitions telles quelles.
   - Retire le préfixe du locuteur ("Nom: ") mais rien d'autre.
   - Garde le passage utile : d'une à quatre phrases consécutives. Ne colle pas des morceaux non contigus.
   - Si tu ne retrouves pas le passage dans le transcript, mets null. N'invente JAMAIS une citation.

5. REFORMULATION — "suggested_response" : ce que le commercial aurait dû répondre, rédigé à la première personne, tel qu'il aurait pu le dire à voix haute (2 à 4 phrases). Appuie-toi sur la manière de traiter attendue de la catégorie quand elle existe, et sur ce que le prospect a réellement dit. Mets null si l'objection a été bien traitée : il n'y a alors rien à corriger.

Réponds UNIQUEMENT en JSON strict, sans markdown, avec exactement cette structure :
{"results": [{"index": 0, "category": 1, "quality": "bien_traitee", "comment": "...", "compared_to_playbook": true, "prospect_verbatim": "...", "commercial_verbatim": "...", "suggested_response": null}]}

"index" est l'index de l'objection dans la liste fournie (à partir de 0), "category" le numéro de la catégorie ou null. Un objet par objection, dans l'ordre, aucun oubli.`;

type RawResult = {
  index?: number;
  category?: number | null;
  quality?: string;
  comment?: string;
  compared_to_playbook?: boolean;
  prospect_verbatim?: string | null;
  commercial_verbatim?: string | null;
  suggested_response?: string | null;
};

// Insensible à la ponctuation, à la casse et aux espaces multiples : un
// modèle qui recopie fidèlement peut malgré tout normaliser une apostrophe
// ou des points de suspension, ce qui ne doit pas invalider la citation.
function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Garde-fou central : une citation qui n'apparaît pas dans le transcript est
// une invention du modèle, et un manager pourrait reprendre un commercial sur
// une phrase qu'il n'a jamais dite. On préfère renvoyer null — l'UI retombe
// alors sur le résumé en indiquant que c'en est un.
function findVerbatim(candidate: unknown, normalizedTranscript: string): string | null {
  if (typeof candidate !== "string") return null;
  const quote = candidate.trim();
  if (quote.length < 10) return null;

  const normalizedQuote = normalizeForMatching(quote);
  if (!normalizedQuote || !normalizedTranscript.includes(normalizedQuote)) {
    console.warn("[objection-classifier] verbatim introuvable dans le transcript, ignoré:", quote.slice(0, 120));
    return null;
  }
  return quote;
}

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
  objections: CallObjection[],
  // Le transcript complet : indispensable pour extraire les verbatims. Absent
  // (call trop ancien, transcript perdu), la classification et l'évaluation
  // se font quand même sur les résumés, sans citations.
  transcript?: string | null
): Promise<ClassifiedObjection[]> {
  const unclassified = (): ClassifiedObjection[] =>
    objections.map((o) => ({
      objection: o.objection,
      response: o.response,
      prospectVerbatim: null,
      commercialVerbatim: null,
      suggestedResponse: null,
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

  const transcriptBlock = transcript?.trim()
    ? `\n\nTranscript complet du call (source unique des verbatims — n'invente rien qui n'y figure pas) :\n\n${transcript.trim()}`
    : "\n\n(Transcript indisponible pour ce call : mets null dans prospect_verbatim et commercial_verbatim.)";

  const userMessage = `Catégories d'objections définies par le directeur commercial :

${categoryBlock}

Objections soulevées pendant ce call (résumés) :

${objectionBlock}${transcriptBlock}`;

  let raw = "";
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      // Relevé de 3000 : chaque objection porte désormais deux citations et
      // une reformulation en plus du verdict. Un call à 8 objections
      // tronquait la réponse à 3000, et une troncature ici fait perdre la
      // classification de TOUTES les objections du call (JSON invalide).
      max_tokens: 8000,
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

    const normalizedTranscript = transcript?.trim() ? normalizeForMatching(transcript) : "";

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

      // Pas de reformulation quand l'objection a été bien traitée : il n'y a
      // rien à corriger, et en afficher une donnerait l'impression du
      // contraire.
      const suggested =
        quality !== "bien_traitee" && typeof result?.suggested_response === "string" && result.suggested_response.trim()
          ? result.suggested_response.trim()
          : null;

      return {
        objection: o.objection,
        response: o.response,
        prospectVerbatim: normalizedTranscript ? findVerbatim(result?.prospect_verbatim, normalizedTranscript) : null,
        commercialVerbatim: normalizedTranscript ? findVerbatim(result?.commercial_verbatim, normalizedTranscript) : null,
        suggestedResponse: suggested,
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
