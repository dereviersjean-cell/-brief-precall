import type { TranscriptJson } from "./recall";

// Métriques d'interaction d'un call, dérivées du seul transcript_json.
// Complète lib/transcript-analytics.ts (qui produit un détail par speaker
// pour l'affichage d'UN call dans /feedback/[id]) : ici on produit la
// poignée de scalaires agrégeables sur des centaines de calls, ceux que
// l'onglet Performance > Analytics compare entre commerciaux.
//
// Pur par construction (aucun accès DB/Recall) — même choix que
// computeConversationAnalytics : testable et le serveur garde la main sur
// quand cela se calcule.
export type CallInteractionMetrics = {
  duration_ms: number;
  commercial_talk_ms: number;
  prospect_talk_ms: number;
  // null seulement si personne n'a parlé du tout — le cas « commercial non
  // identifié » ne produit plus de métriques du tout (voir ci-dessous).
  talk_ratio_pct: number | null;
  longest_monologue_ms: number;
  longest_prospect_story_ms: number;
  commercial_questions_count: number;
  question_rate: number;
  interactivity_score: number;
  patience_ms: number | null;
  turns_count: number;
};

const MIN_TURNS_FOR_METRICS = 5;

// Une alternance de locuteur toutes les 10 s (6/min) = conversation très
// vivante → 10/10. Repère calibré sur les vrais transcripts de démo, et
// volontairement explicite ici plutôt que noyé dans la formule : c'est le
// seul paramètre subjectif de tout ce fichier.
const ALTERNATIONS_PER_MINUTE_FOR_MAX_SCORE = 6;

// Au-delà, le blanc n'est plus « laisser respirer le prospect » mais une
// coupure (pause technique, quelqu'un qui part chercher un document) — la
// moyenne de patience serait tirée par ces valeurs aberrantes.
const MAX_MEANINGFUL_SILENCE_MS = 15_000;

function turnDurationMs(turn: TranscriptJson["turns"][number]): number {
  return Math.max(0, turn.end_ms - turn.start_ms);
}

// `commercialSpeakerId` prioritaire quand il est connu ; sinon on retombe
// sur la comparaison nom-à-nom avec le display_name résolu à l'ingestion,
// exactement comme computeConversationAnalytics. Jamais d'heuristique
// « le plus bavard est le commercial » ici : une métrique fausse est pire
// qu'une métrique absente — d'où le retour null quand l'identification
// échoue, plutôt que des compteurs commerciaux à zéro.
export function computeCallInteractionMetrics(
  transcriptJson: TranscriptJson,
  speakerNamesOverride: Record<string, string>,
  commercialName: string | null,
  commercialSpeakerId?: string
): CallInteractionMetrics | null {
  const turns = transcriptJson.turns;
  if (turns.length < MIN_TURNS_FOR_METRICS) return null;

  const normalizedCommercialName = commercialName?.trim() || null;
  const isCommercialSpeaker = (speakerId: string): boolean => {
    if (commercialSpeakerId != null) return speakerId === commercialSpeakerId;
    if (!normalizedCommercialName) return false;
    return (speakerNamesOverride[speakerId] || speakerId).trim() === normalizedCommercialName;
  };

  // Aucun speaker rattaché au commercial : on ne produit RIEN plutôt que des
  // métriques à zéro. « Prospect » se définit ici comme « pas le commercial »,
  // donc sans cette identification le temps de parole, les monologues et le
  // nombre de questions du commercial vaudraient tous 0 — et ces zéros,
  // persistés, tireraient les moyennes d'équipe vers le bas comme s'il
  // s'agissait d'une contre-performance réelle. Le call est simplement absent
  // de l'onglet Analytics.
  if (!turns.some((t) => isCommercialSpeaker(t.speaker_id))) return null;

  let commercialTalkMs = 0;
  let prospectTalkMs = 0;
  let longestMonologueMs = 0;
  let longestProspectStoryMs = 0;
  let commercialQuestions = 0;

  for (const turn of turns) {
    const duration = turnDurationMs(turn);
    if (isCommercialSpeaker(turn.speaker_id)) {
      commercialTalkMs += duration;
      // « Plus long monologue » = la plus longue prise de parole ininterrompue
      // du commercial ; côté prospect la même mesure s'appelle « plus longue
      // prise de parole » et se lit à l'inverse (plus c'est long, mieux c'est).
      if (duration > longestMonologueMs) longestMonologueMs = duration;
      if (/\?/.test(turn.text)) commercialQuestions++;
    } else {
      prospectTalkMs += duration;
      if (duration > longestProspectStoryMs) longestProspectStoryMs = duration;
    }
  }

  const totalSpokenMs = commercialTalkMs + prospectTalkMs;
  const talkRatioPct = totalSpokenMs > 0 ? Math.round((100 * commercialTalkMs) / totalSpokenMs) : null;

  let alternations = 0;
  for (let i = 1; i < turns.length; i++) {
    if (turns[i - 1].speaker_id !== turns[i].speaker_id) alternations++;
  }

  // total_duration_ms peut être 0 sur un transcript dégradé — on retombe sur
  // la somme des temps de parole plutôt que de diviser par zéro partout.
  const durationMs = transcriptJson.total_duration_ms > 0 ? transcriptJson.total_duration_ms : totalSpokenMs;
  const durationMinutes = durationMs / 60_000;

  const interactivityScore =
    durationMinutes > 0
      ? Math.min(10, (alternations / durationMinutes) * (10 / ALTERNATIONS_PER_MINUTE_FOR_MAX_SCORE))
      : 0;

  const questionRate = durationMinutes > 0 ? (commercialQuestions / durationMinutes) * 60 : 0;

  // Patience = le blanc que le commercial laisse avant de reprendre la parole
  // après le prospect. Ne se mesure que dans ce sens : un prospect qui met du
  // temps à répondre ne dit rien du comportement du commercial.
  let silenceSum = 0;
  let silenceCount = 0;
  for (let i = 1; i < turns.length; i++) {
    const prev = turns[i - 1];
    const curr = turns[i];
    if (isCommercialSpeaker(prev.speaker_id) || !isCommercialSpeaker(curr.speaker_id)) continue;
    const gap = curr.start_ms - prev.end_ms;
    if (gap < 0 || gap > MAX_MEANINGFUL_SILENCE_MS) continue;
    silenceSum += gap;
    silenceCount++;
  }

  return {
    duration_ms: Math.round(durationMs),
    commercial_talk_ms: Math.round(commercialTalkMs),
    prospect_talk_ms: Math.round(prospectTalkMs),
    talk_ratio_pct: talkRatioPct,
    longest_monologue_ms: Math.round(longestMonologueMs),
    longest_prospect_story_ms: Math.round(longestProspectStoryMs),
    commercial_questions_count: commercialQuestions,
    question_rate: Math.round(questionRate * 10) / 10,
    interactivity_score: Math.round(interactivityScore * 10) / 10,
    patience_ms: silenceCount > 0 ? Math.round(silenceSum / silenceCount) : null,
    turns_count: turns.length,
  };
}
