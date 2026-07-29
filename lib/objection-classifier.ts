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

1. RATTACHEMENT — déterminer à quelle catégorie elle appartient, par le sens et non par les mots employés. « C'est trop cher », « on n'a pas le budget cette année » et « votre concurrent est moitié prix » relèvent d'intentions différentes : lis la définition de chaque catégorie avant de trancher. Renvoie le numéro de la catégorie, ou null.

   Le rattachement doit être EXACT, pas approximatif. Rattache uniquement si l'objection correspond au cœur même de la définition de la catégorie. Un simple voisinage thématique ne suffit pas : « où sont basées vos équipes ? » ne relève PAS de « impossibilité d'écouter les appels » sous prétexte que les deux parlent d'appels téléphoniques. Au moindre doute, renvoie null.

   Une objection non classée n'est pas un échec : elle signale au directeur commercial qu'il lui manque une catégorie, ce qui lui est utile. Une objection MAL rangée, elle, fausse les statistiques sur lesquelles il décide. Dix objections en null valent mieux qu'une seule mal rattachée.

2. ÉVALUATION — juger la réponse apportée par le commercial :
   - "bien_traitee" : la réponse suit la manière de traiter attendue et lève réellement l'objection.
   - "partiellement" : la réponse va dans la bonne direction mais reste incomplète, ou passe à côté d'un élément clé attendu.
   - "non_traitee" : aucune réponse, une esquive, un changement de sujet, ou une réponse qui ne traite pas l'objection.
   Quand la catégorie rattachée a une manière de traiter attendue, évalue PAR RAPPORT À ELLE et mets "compared_to_playbook": true. Sinon, évalue au jugement commercial général et mets "compared_to_playbook": false.

3. COMMENTAIRE — une phrase (25 mots max) qui dit concrètement ce qui a été bien fait ou ce qui manquait. Pas de généralité : cite l'élément précis. Le commentaire doit se suffire à lui-même : ne renvoie JAMAIS à une autre objection (« comme pour l'objection 3 », « même réponse que plus haut ») — chaque objection est lue séparément, ces numéros n'existent pas pour le lecteur. Si deux objections appellent le même constat, réécris-le entièrement.

4. VERBATIM — situe dans le transcript numéroté les passages RÉELLEMENT PRONONCÉS, en renvoyant leurs NUMÉROS DE LIGNE, jamais leur texte :
   - "prospect_lines" : [première ligne, dernière ligne] du passage où le prospect soulève cette objection.
   - "commercial_lines" : [première ligne, dernière ligne] du passage où le commercial y répond.
   Règles :
   - Un intervalle de lignes CONSÉCUTIVES, 4 lignes maximum. Si le passage utile est plus long, garde les lignes les plus significatives.
   - Une seule ligne : [12, 12].
   - Si tu ne trouves pas le passage, mets null. Ne devine pas un numéro au hasard.

5. REFORMULATION — "suggested_response" : ce que le commercial aurait dû répondre, rédigé à la première personne, tel qu'il aurait pu le dire à voix haute (2 à 4 phrases). Appuie-toi sur la manière de traiter attendue de la catégorie quand elle existe, et sur ce que le prospect a réellement dit. Mets null si l'objection a été bien traitée : il n'y a alors rien à corriger.

Réponds UNIQUEMENT en JSON strict, sans markdown, avec exactement cette structure :
{"results": [{"index": 0, "category": 1, "quality": "bien_traitee", "comment": "...", "compared_to_playbook": true, "prospect_lines": [12, 13], "commercial_lines": [14, 14], "suggested_response": null}]}

"index" est l'index de l'objection dans la liste fournie (à partir de 0), "category" le numéro de la catégorie ou null. Un objet par objection, dans l'ordre, aucun oubli.`;

type RawResult = {
  index?: number;
  category?: number | null;
  quality?: string;
  comment?: string;
  compared_to_playbook?: boolean;
  prospect_lines?: unknown;
  commercial_lines?: unknown;
  suggested_response?: string | null;
};

// Le transcript est envoyé au modèle avec ses lignes numérotées, et le modèle
// renvoie des INTERVALLES DE LIGNES plutôt que du texte recopié. Deux raisons,
// toutes deux vérifiées en conditions réelles sur les calls d'Oliverlist :
//  · fidélité garantie par construction — le texte affiché est extrait du
//    transcript par le code, le modèle ne peut plus « nettoyer » une phrase ni
//    recoller des morceaux non contigus. La version précédente demandait une
//    copie mot à mot et vérifiait après coup : un tiers des citations étaient
//    rejetées pour de simples retouches de surface, donc perdues.
//  · sortie beaucoup plus courte — deux paires de nombres au lieu de deux
//    citations, ce qui divise la taille de la réponse et éloigne la troncature
//    (voir le découpage en lots plus bas).
const MAX_VERBATIM_LINES = 4;

function splitTranscriptLines(transcript: string): string[] {
  return transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function numberTranscript(lines: string[]): string {
  return lines.map((line, i) => `[${i}] ${line}`).join("\n");
}

// Retire le préfixe de locuteur (« Dorian Monaco: ») pour ne garder que la
// parole. Même prudence que splitSpeaker de lib/transcript-import.ts : un
// préfixe court et sans ponctuation de phrase, sinon on amputerait le texte.
function stripSpeakerPrefix(line: string): string {
  const match = line.match(/^([^:]{1,40}):\s*(.+)$/);
  if (!match) return line;
  return /[.!?]/.test(match[1]) ? line : match[2];
}

function extractVerbatim(range: unknown, lines: string[]): string | null {
  if (!Array.isArray(range) || range.length !== 2) return null;
  const [rawStart, rawEnd] = range;
  if (typeof rawStart !== "number" || typeof rawEnd !== "number") return null;

  const start = Math.floor(rawStart);
  const end = Math.floor(rawEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  // Numéro hors du transcript = le modèle a inventé une référence.
  if (start < 0 || end < start || end >= lines.length) {
    console.warn(`[objection-classifier] intervalle de lignes hors transcript (${start}-${end}), ignoré`);
    return null;
  }

  const text = lines
    .slice(start, Math.min(end, start + MAX_VERBATIM_LINES - 1) + 1)
    .map(stripSpeakerPrefix)
    .join(" ")
    .trim();
  return text.length >= 10 ? text : null;
}

function isHandlingQuality(value: unknown): value is HandlingQuality {
  return value === "bien_traitee" || value === "partiellement" || value === "non_traitee";
}

// Rattache chaque objection d'un call à une catégorie du manager et note la
// réponse apportée, par lots (voir BATCH_SIZE) plutôt qu'un appel par
// objection : le modèle voit ainsi la liste complète des catégories et
// plusieurs objections du même échange, ce qui donne de meilleurs
// rattachements qu'une suite de décisions isolées.
//
// Ne throw jamais : la classification est un enrichissement. En cas d'échec,
// les objections concernées sont renvoyées non classées et restent indexées
// normalement dans la bibliothèque — comme avant l'existence de ce module.
//
// Le découpage en lots vient d'un échec observé en conditions réelles le
// 29/07/2026 : deux calls d'Oliverlist portaient 34 et 26 objections, la
// réponse dépassait max_tokens, le JSON arrivait tronqué et la classification
// de TOUTES les objections de ces calls était perdue d'un coup — 60 objections
// sur 72. Avec des lots, une réponse tronquée ne coûte plus que son lot.
const BATCH_SIZE = 10;

export async function classifyAndEvaluateObjections(
  categories: ObjectionCategoryForClassifier[],
  objections: CallObjection[],
  // Le transcript complet : indispensable pour extraire les verbatims. Absent
  // (call trop ancien, transcript perdu), la classification et l'évaluation
  // se font quand même sur les résumés, sans citations.
  transcript?: string | null,
  // Interne : numéro de tentative, voir la stratégie de reprise dans le catch.
  attempt = 0
): Promise<ClassifiedObjection[]> {
  const unclassified = (batch: CallObjection[]): ClassifiedObjection[] =>
    batch.map((o) => ({
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
  if (categories.length === 0 || objections.length === 0) return unclassified(objections);

  const transcriptLines = transcript?.trim() ? splitTranscriptLines(transcript) : [];

  if (objections.length > BATCH_SIZE) {
    const results: ClassifiedObjection[] = [];
    for (let i = 0; i < objections.length; i += BATCH_SIZE) {
      results.push(
        ...(await classifyAndEvaluateObjections(categories, objections.slice(i, i + BATCH_SIZE), transcript))
      );
    }
    return results;
  }

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

  const transcriptBlock =
    transcriptLines.length > 0
      ? `\n\nTranscript du call, une ligne par prise de parole, numérotée — c'est à ces numéros que renvoient prospect_lines et commercial_lines :\n\n${numberTranscript(transcriptLines)}`
      : "\n\n(Transcript indisponible pour ce call : mets null dans prospect_lines et commercial_lines.)";

  const userMessage = `Catégories d'objections définies par le directeur commercial :

${categoryBlock}

Objections soulevées pendant ce call (résumés) :

${objectionBlock}${transcriptBlock}`;

  let raw = "";
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      // Large marge : un lot de 10 objections tient très en dessous, les
      // verbatims étant renvoyés sous forme de numéros de ligne et non de
      // texte. C'est la ceinture qui complète les bretelles du découpage.
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
        prospectVerbatim: transcriptLines.length > 0 ? extractVerbatim(result?.prospect_lines, transcriptLines) : null,
        commercialVerbatim: transcriptLines.length > 0 ? extractVerbatim(result?.commercial_lines, transcriptLines) : null,
        suggestedResponse: suggested,
        categoryId: category?.id ?? null,
        handlingQuality: quality,
        handlingComment: comment,
        evaluatedAgainstPlaybook,
      };
    });
  } catch (err) {
    console.error(
      "[objection-classifier] classifyAndEvaluateObjections failed:",
      err instanceof Error ? err.message : String(err),
      raw ? `\nRaw Claude response:\n${raw}` : "(no response captured — API call itself failed)"
    );

    // Deux reprises, dans cet ordre, avant d'abandonner :
    //  1. un simple nouvel essai — l'échec observé en conditions réelles était
    //     un `}` surnuméraire émis par le modèle au milieu d'un JSON par
    //     ailleurs valide, exactement le type de dérapage intermittent qui ne
    //     se reproduit pas au tirage suivant (même nature que le bug des
    //     caractères de contrôle bruts, § génération IA de CLAUDE.md) ;
    //  2. si ça rate encore et que le lot contient plusieurs objections, on le
    //     coupe en deux : une réponse plus courte échoue moins, et l'échec
    //     éventuel ne coûte plus que la moitié.
    if (attempt === 0) {
      return classifyAndEvaluateObjections(categories, objections, transcript, 1);
    }
    if (objections.length > 1) {
      const middle = Math.ceil(objections.length / 2);
      const [head, tail] = [objections.slice(0, middle), objections.slice(middle)];
      return [
        ...(await classifyAndEvaluateObjections(categories, head, transcript)),
        ...(await classifyAndEvaluateObjections(categories, tail, transcript)),
      ];
    }
    return unclassified(objections);
  }
}
