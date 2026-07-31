import Anthropic from "@anthropic-ai/sdk";
import { extractJsonObject } from "./ai-json";
import { reportWarning } from "./monitoring";
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
  // Restitution en puces courtes — ce que le manager lit en premier, le
  // verbatim restant disponible d'un clic.
  prospectBullets: string[];
  commercialBullets: string[];
  // « certaine » : à afficher. « incertaine » : stockée mais jamais montrée
  // (décision du 31/07/2026 — ne rien montrer dont on n'est pas sûr).
  confidence: "certaine" | "incertaine";
  // Position du passage dans l'enregistrement, pour caler la vidéo. Null
  // quand le transcript n'est pas horodaté.
  startMs: number | null;
  endMs: number | null;
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

0. CONFIANCE — « certaine » ou « incertaine ». Mets « certaine » UNIQUEMENT si, en relisant le passage, il ne fait aucun doute que le prospect exprime une réticence qui freine la vente. Au moindre doute — remarque ambiguë, ton neutre, question qui pourrait n'être qu'une demande d'information, passage trop court pour trancher — mets « incertaine ». Les incertaines ne seront montrées à personne : il vaut infiniment mieux en manquer une que d'en afficher une qui n'en est pas.

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
   - **La réponse du commercial est celle qui SUIT IMMÉDIATEMENT l'objection**, dans les quelques lignes qui viennent après "prospect_lines". Ne va PAS chercher plus loin dans le call un passage qui ressemblerait à une bonne réponse à cette objection : ce n'est pas ce que le commercial a répondu sur le moment, et c'est le moment qui est évalué. Un même call revient souvent sur le budget, le planning ou les prochaines étapes à plusieurs reprises — seule la reprise qui suit l'objection compte.
   - Si le commercial enchaîne sur autre chose sans traiter l'objection (il pose une question sans rapport, change de sujet), c'est une information en soi : renvoie quand même les lignes de ce qu'il a dit juste après, et note la qualité "non_traitee". Ne compense pas en cherchant ailleurs une réponse qui l'arrangerait.

5. RESTITUTION EN PUCES — deux listes courtes, c'est ce que le manager lit en premier :
   - "prospect_bullets" : 1 à 3 puces disant ce que le prospect exprime. Une idée par puce, 12 mots maximum, à l'infinitif ou en groupe nominal (« Trouve le fixe mensuel trop élevé », « Compare avec deux autres prestataires »). Pas de phrase complète, pas de « Le prospect… » répété.
   - "commercial_bullets" : 1 à 3 puces disant ce que le commercial a répondu, même format. Liste vide s'il n'a pas répondu.
   Ces puces résument, elles ne citent pas — le verbatim exact est déjà couvert par les numéros de ligne ci-dessus.

6. REFORMULATION — "suggested_response" : ce que le commercial aurait dû répondre, rédigé à la première personne, tel qu'il aurait pu le dire à voix haute (2 à 4 phrases). Appuie-toi sur la manière de traiter attendue de la catégorie quand elle existe, et sur ce que le prospect a réellement dit. Mets null si l'objection a été bien traitée : il n'y a alors rien à corriger.

Réponds UNIQUEMENT en JSON strict, sans markdown, avec exactement cette structure :
{"results": [{"index": 0, "confidence": "certaine", "category": 1, "quality": "bien_traitee", "comment": "...", "compared_to_playbook": true, "prospect_lines": [12, 13], "commercial_lines": [14, 14], "prospect_bullets": ["..."], "commercial_bullets": ["..."], "suggested_response": null}]}

"index" est l'index de l'objection dans la liste fournie (à partir de 0), "category" le numéro de la catégorie ou null. Un objet par objection, dans l'ordre, aucun oubli.`;

type RawResult = {
  index?: number;
  category?: number | null;
  quality?: string;
  comment?: string;
  compared_to_playbook?: boolean;
  prospect_lines?: unknown;
  commercial_lines?: unknown;
  prospect_bullets?: unknown;
  commercial_bullets?: unknown;
  suggested_response?: string | null;
  confidence?: string;
};

function parseBullets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b) => String(b).trim()).filter(Boolean).slice(0, 3);
}

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

// Fenêtre au-delà de laquelle un passage ne peut plus être « la réponse à
// cette objection ». Constaté en conditions réelles le 31/07/2026 : sur une
// objection budget à 25:40, le modèle est allé chercher un « je vous envoie un
// mail récap » situé bien plus loin dans le call, parce qu'il RESSEMBLE à un
// traitement d'objection budget. Le commercial avait en réalité enchaîné sur
// une question de panier moyen — donc l'objection n'était pas traitée, et
// l'évaluation affichée était fausse en plus d'être flatteuse.
//
// 8 tours : assez large pour absorber un prospect qui poursuit sur deux ou
// trois tours avant que le commercial reprenne, assez serré pour interdire un
// saut à l'autre bout de l'appel.
const MAX_RESPONSE_GAP_TURNS = 8;

// Une ligne numérotée présentée au modèle. Quand le call vient d'un
// enregistrement, la ligne EST un tour de parole horodaté — c'est ce qui
// permet de renvoyer une position dans la vidéo en plus du verbatim. Sans
// horodatage (import de texte brut), on retombe sur un découpage par ligne et
// les timings restent nuls.
type TranscriptLine = { text: string; startMs: number | null; endMs: number | null };

export type TimedTurn = { text: string; start_ms: number; end_ms: number; speaker_id: string };

function buildLines(transcript: string, turns?: TimedTurn[] | null): TranscriptLine[] {
  if (turns && turns.length > 0) {
    return turns.map((t) => ({
      // Préfixe conservé pour que le modèle sache qui parle ; stripSpeakerPrefix
      // le retire à l'extraction du verbatim.
      text: `${t.speaker_id}: ${t.text}`.trim(),
      startMs: t.start_ms,
      endMs: t.end_ms,
    }));
  }
  return transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text, startMs: null, endMs: null }));
}

function numberTranscript(lines: TranscriptLine[]): string {
  return lines.map((line, i) => `[${i}] ${line.text}`).join("\n");
}

// Retire le préfixe de locuteur (« Dorian Monaco: ») pour ne garder que la
// parole. Même prudence que splitSpeaker de lib/transcript-import.ts : un
// préfixe court et sans ponctuation de phrase, sinon on amputerait le texte.
function stripSpeakerPrefix(line: string): string {
  const match = line.match(/^([^:]{1,40}):\s*(.+)$/);
  if (!match) return line;
  // Même garde-fou que splitSpeaker de lib/transcript-import.ts : sur une
  // ligne « 00:45 Nom: texte », le premier « : » est celui de l'horodatage.
  // Sans ça on retire « 00: » et on laisse « 45 Nom: texte » dans le verbatim.
  if (/^\d+$/.test(match[1].trim())) return line;
  return /[.!?]/.test(match[1]) ? line : match[2];
}

// Résout un intervalle de lignes en texte ET en position temporelle.
type ResolvedRange = {
  verbatim: string | null;
  startMs: number | null;
  endMs: number | null;
  startIndex: number | null;
  endIndex: number | null;
};

function resolveRange(range: unknown, lines: TranscriptLine[]): ResolvedRange {
  const empty: ResolvedRange = { verbatim: null, startMs: null, endMs: null, startIndex: null, endIndex: null };
  if (!Array.isArray(range) || range.length !== 2) return empty;
  const [rawStart, rawEnd] = range;
  if (typeof rawStart !== "number" || typeof rawEnd !== "number") return empty;

  const start = Math.floor(rawStart);
  const end = Math.floor(rawEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return empty;
  // Numéro hors du transcript = le modèle a inventé une référence.
  if (start < 0 || end < start || end >= lines.length) {
    console.warn(`[objection-classifier] intervalle de lignes hors transcript (${start}-${end}), ignoré`);
    return empty;
  }

  const slice = lines.slice(start, Math.min(end, start + MAX_VERBATIM_LINES - 1) + 1);
  const text = slice.map((l) => stripSpeakerPrefix(l.text)).join(" ").trim();

  return {
    verbatim: text.length >= 10 ? text : null,
    startMs: slice[0]?.startMs ?? null,
    endMs: slice[slice.length - 1]?.endMs ?? null,
    startIndex: start,
    endIndex: Math.min(end, start + MAX_VERBATIM_LINES - 1),
  };
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
  // Tours de parole horodatés (calls.transcript_json). Quand ils sont fournis,
  // ce sont EUX qui sont numérotés pour le modèle, ce qui permet de rendre en
  // plus la position du passage dans l'enregistrement — donc de caler la vidéo
  // sur le moment de l'objection.
  turns?: TimedTurn[] | null,
  // Interne : numéro de tentative, voir la stratégie de reprise dans le catch.
  attempt = 0
): Promise<ClassifiedObjection[]> {
  const unclassified = (batch: CallObjection[]): ClassifiedObjection[] =>
    batch.map((o) => ({
      objection: o.objection,
      response: o.response,
      prospectVerbatim: null,
      commercialVerbatim: null,
      prospectBullets: [],
      commercialBullets: [],
      // Rien n'a pu être vérifié : on ne peut pas la déclarer certaine.
      confidence: "incertaine" as const,
      startMs: null,
      endMs: null,
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

  const transcriptLines = transcript?.trim() || (turns && turns.length > 0) ? buildLines(transcript ?? "", turns) : [];

  if (objections.length > BATCH_SIZE) {
    const results: ClassifiedObjection[] = [];
    for (let i = 0; i < objections.length; i += BATCH_SIZE) {
      results.push(
        ...(await classifyAndEvaluateObjections(categories, objections.slice(i, i + BATCH_SIZE), transcript, turns))
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
      const emptyRange: ResolvedRange = {
        verbatim: null,
        startMs: null,
        endMs: null,
        startIndex: null,
        endIndex: null,
      };
      const prospectRange =
        transcriptLines.length > 0 ? resolveRange(result?.prospect_lines, transcriptLines) : emptyRange;
      const rawCommercialRange =
        transcriptLines.length > 0 ? resolveRange(result?.commercial_lines, transcriptLines) : emptyRange;

      // Une réponse ne peut être la réponse À CETTE objection que si elle vient
      // après elle et peu après. Hors fenêtre, le modèle est allé pêcher
      // ailleurs un passage qui sonnait bien : on écarte le passage ET on
      // dégrade la confiance, parce que sa note de traitement a été formée sur
      // le mauvais extrait — la garder reviendrait à afficher une évaluation
      // fausse. Le modèle qui renvoie null de lui-même, en revanche, est un cas
      // légitime : le commercial n'a pas répondu, l'objection est non traitée.
      const outOfWindow =
        rawCommercialRange.startIndex !== null &&
        prospectRange.endIndex !== null &&
        (rawCommercialRange.startIndex <= prospectRange.startIndex! ||
          rawCommercialRange.startIndex > prospectRange.endIndex + MAX_RESPONSE_GAP_TURNS);

      if (outOfWindow) {
        console.warn(
          `[objection-classifier] réponse hors fenêtre (objection lignes ${prospectRange.startIndex}-${prospectRange.endIndex}, réponse ligne ${rawCommercialRange.startIndex}) — passage écarté et objection déclassée en incertaine`
        );
      }
      const commercialRange = outOfWindow ? emptyRange : rawCommercialRange;
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
        prospectVerbatim: prospectRange.verbatim,
        commercialVerbatim: commercialRange.verbatim,
        prospectBullets: parseBullets(result?.prospect_bullets),
        commercialBullets: parseBullets(result?.commercial_bullets),
        // Le modèle doit se prononcer explicitement : toute valeur autre que
        // « certaine » (absente, mal orthographiée, inventée) est traitée comme
        // un doute, donc masquée. Le défaut penche du côté prudent.
        confidence:
          result?.confidence === "certaine" && !outOfWindow ? ("certaine" as const) : ("incertaine" as const),
        // Le passage du PROSPECT donne le moment de l'objection : c'est là que
        // le manager veut que la vidéo démarre, pas sur la réponse.
        startMs: prospectRange.startMs,
        endMs: commercialRange.endMs ?? prospectRange.endMs,
        suggestedResponse: suggested,
        categoryId: category?.id ?? null,
        handlingQuality: quality,
        handlingComment: comment,
        evaluatedAgainstPlaybook,
      };
    });
  } catch (err) {
    // Remonté même si une reprise suit : un lot qui échoue systématiquement
    // se verrait sinon uniquement dans les logs, et c'est exactement comme ça
    // que deux calls entiers ont perdu leur classification sans que personne
    // ne le sache (bug #25).
    reportWarning("objection-classifier.classify", err, {
      objectionsInBatch: objections.length,
      attempt,
      rawPreview: raw.slice(0, 500),
    });

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
      return classifyAndEvaluateObjections(categories, objections, transcript, turns, 1);
    }
    if (objections.length > 1) {
      const middle = Math.ceil(objections.length / 2);
      const [head, tail] = [objections.slice(0, middle), objections.slice(middle)];
      return [
        ...(await classifyAndEvaluateObjections(categories, head, transcript, turns)),
        ...(await classifyAndEvaluateObjections(categories, tail, transcript, turns)),
      ];
    }
    return unclassified(objections);
  }
}
