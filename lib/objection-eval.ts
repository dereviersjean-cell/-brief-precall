import { generateEmbeddingsBatch } from "./embeddings";

// Socle de mesure du pipeline d'objections (extraction + rattachement).
//
// Raison d'être : jusqu'ici chaque réglage de prompt se jugeait sur une
// capture d'écran isolée. On a desserré puis resserré la définition d'une
// objection en une journée sans jamais pouvoir dire si le second réglage
// valait mieux que le premier — passer de 30 à 11 objections peut aussi bien
// vouloir dire « on a retiré le bruit » que « on a perdu la moitié du signal ».
// Ce module donne les chiffres qui tranchent.
//
// Pur (aucun accès DB) hormis l'appel d'embeddings, pour rester testable.

export type ExpectedObjection = {
  objection: string;
  // Libellé de la catégorie attendue, ou null pour « doit rester non classée ».
  category: string | null;
};

export type PredictedObjection = {
  objection: string;
  categoryLabel: string | null;
};

export type MatchedPair = {
  expected: ExpectedObjection;
  predicted: PredictedObjection;
  similarity: number;
  categoryCorrect: boolean;
};

export type EvalResult = {
  matched: MatchedPair[];
  // Objections attendues qu'aucune prédiction ne couvre : le pipeline les a
  // ratées (défaut de rappel).
  missed: ExpectedObjection[];
  // Objections prédites qui ne correspondent à rien d'attendu : du bruit
  // (défaut de précision) — typiquement une question prise pour une objection.
  spurious: PredictedObjection[];
  precision: number;
  recall: number;
  f1: number;
  // Part des objections correctement appariées dont la catégorie est la bonne
  // (null attendu et null obtenu compte comme correct : « ne pas classer » est
  // une décision juste, pas une absence de décision).
  categoryAccuracy: number | null;
};

// Deux formulations de la même objection ne se ressemblent pas mot pour mot
// (« le budget n'est pas défini » vs « Claire n'a pas encore son enveloppe »).
// L'appariement passe donc par les embeddings — c'est l'usage pour lequel ils
// sont réellement bons : reconnaître deux paraphrases. À ne pas confondre avec
// le rattachement à une catégorie, où la proximité thématique induit en erreur
// (cf. lib/objection-classifier.ts).
//
// Seuil calibré à la main : en dessous, on apparie des objections qui parlent
// vaguement du même sujet sans être la même. Le rapport affiche la similarité
// de chaque paire pour qu'on puisse le réajuster en connaissance de cause.
export const MATCH_THRESHOLD = 0.75;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

function sameCategory(expected: string | null, predicted: string | null): boolean {
  if (expected === null || predicted === null) return expected === predicted;
  return expected.trim().toLowerCase() === predicted.trim().toLowerCase();
}

export async function evaluateObjections(
  expected: ExpectedObjection[],
  predicted: PredictedObjection[]
): Promise<EvalResult> {
  const empty = (): EvalResult => ({
    matched: [],
    missed: [...expected],
    spurious: [...predicted],
    precision: predicted.length === 0 ? 1 : 0,
    recall: expected.length === 0 ? 1 : 0,
    f1: expected.length === 0 && predicted.length === 0 ? 1 : 0,
    categoryAccuracy: null,
  });

  if (expected.length === 0 || predicted.length === 0) return empty();

  const vectors = await generateEmbeddingsBatch([
    ...expected.map((e) => e.objection),
    ...predicted.map((p) => p.objection),
  ]);
  const expectedVectors = vectors.slice(0, expected.length);
  const predictedVectors = vectors.slice(expected.length);

  // Appariement glouton par similarité décroissante : chaque objection
  // attendue et chaque prédiction ne peuvent servir qu'une fois. Un appariement
  // optimal (Hongrois) serait plus juste en théorie, mais sur une dizaine
  // d'objections par call l'écart est nul et le glouton reste lisible.
  const candidates: { i: number; j: number; similarity: number }[] = [];
  for (let i = 0; i < expected.length; i++) {
    const ev = expectedVectors[i];
    if (!ev) continue;
    for (let j = 0; j < predicted.length; j++) {
      const pv = predictedVectors[j];
      if (!pv) continue;
      const similarity = cosineSimilarity(ev, pv);
      if (similarity >= MATCH_THRESHOLD) candidates.push({ i, j, similarity });
    }
  }
  candidates.sort((a, b) => b.similarity - a.similarity);

  const usedExpected = new Set<number>();
  const usedPredicted = new Set<number>();
  const matched: MatchedPair[] = [];

  for (const candidate of candidates) {
    if (usedExpected.has(candidate.i) || usedPredicted.has(candidate.j)) continue;
    usedExpected.add(candidate.i);
    usedPredicted.add(candidate.j);
    matched.push({
      expected: expected[candidate.i],
      predicted: predicted[candidate.j],
      similarity: candidate.similarity,
      categoryCorrect: sameCategory(expected[candidate.i].category, predicted[candidate.j].categoryLabel),
    });
  }

  const missed = expected.filter((_, i) => !usedExpected.has(i));
  const spurious = predicted.filter((_, j) => !usedPredicted.has(j));

  const precision = predicted.length === 0 ? 1 : matched.length / predicted.length;
  const recall = expected.length === 0 ? 1 : matched.length / expected.length;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    matched,
    missed,
    spurious,
    precision,
    recall,
    f1,
    categoryAccuracy:
      matched.length === 0 ? null : matched.filter((m) => m.categoryCorrect).length / matched.length,
  };
}

export function aggregate(results: EvalResult[]): {
  precision: number;
  recall: number;
  f1: number;
  categoryAccuracy: number | null;
} {
  // Micro-moyenne (on somme les objections, pas les calls) : un call à 12
  // objections doit peser plus qu'un call à 2, sinon un petit call parfait
  // masque un gros call raté.
  const matched = results.reduce((sum, r) => sum + r.matched.length, 0);
  const predicted = matched + results.reduce((sum, r) => sum + r.spurious.length, 0);
  const expected = matched + results.reduce((sum, r) => sum + r.missed.length, 0);
  const correctCategory = results.reduce(
    (sum, r) => sum + r.matched.filter((m) => m.categoryCorrect).length,
    0
  );

  const precision = predicted === 0 ? 1 : matched / predicted;
  const recall = expected === 0 ? 1 : matched / expected;
  return {
    precision,
    recall,
    f1: precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall),
    categoryAccuracy: matched === 0 ? null : correctCategory / matched,
  };
}
