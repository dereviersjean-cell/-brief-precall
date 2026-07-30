// Regroupement des objections non classées par similarité d'embedding.
//
// But : quand le classifieur laisse une objection en « Non classées », ce n'est
// pas un échec mais un signal — il manque une catégorie au manager. Encore
// faut-il qu'il le voie. À 4 objections orphelines on repère le thème à l'œil ;
// à 60, non. Ce module fait émerger les regroupements pour que l'app propose
// elle-même les catégories manquantes.
//
// C'est le BON usage des embeddings : rapprocher des formulations différentes
// d'une même idée. À ne pas confondre avec le rattachement à une catégorie
// existante, où la proximité thématique induit en erreur (cf.
// lib/objection-classifier.ts) — ici on ne décide rien, on regroupe et un
// humain tranche.
//
// Pur (aucun accès DB ni IA) : les vecteurs sont fournis par l'appelant.

export type ClusterableObjection = {
  id: string;
  objection: string;
  verbatim: string | null;
  embedding: number[];
};

export type ObjectionCluster = {
  members: Omit<ClusterableObjection, "embedding">[];
  // Objection la plus proche du centre du groupe : la plus représentative,
  // celle à montrer en premier au manager.
  representative: string;
  // Cohésion moyenne du groupe. Un groupe très cohésif mérite plus de
  // confiance qu'un groupe qui tient de justesse au seuil.
  cohesion: number;
};

// MESURÉ, pas supposé. Sur les objections réelles d'Oliverlist (voyage-3,
// 1024 dimensions, 55 paires) : minimum 0,09, médiane 0,30, maximum 0,64. Une
// première valeur à 0,72 posée d'intuition ne pouvait rien regrouper — les
// plages de similarité varient beaucoup d'un modèle d'embedding à l'autre, il
// faut les relever sur le corpus visé avant de fixer un seuil.
// Comportement observé en descendant : à 0,55 deux groupes nets (un intrus en
// tout) ; à 0,50 un troisième groupe légitime apparaît mais le plus gros
// absorbe une objection sans rapport ; à 0,45 tout s'effondre en un fourre-tout
// de 7. On retient 0,55 — un groupe trop large devient innommable et l'étape de
// nommage l'écarte ENTIÈREMENT, ce qui ferait perdre aussi ses membres
// légitimes. Mieux vaut proposer moins et proposer juste.
const DEFAULT_SIMILARITY_THRESHOLD = 0.55;

// ATTENTION — la similarité seule ne suffit PAS à produire des groupes propres.
// Sur ce même corpus, la paire la MIEUX notée (0,638) est un faux positif :
// « la conversion des leads achetés est trop faible » et « on a été échaudés
// par un prestataire » parlent tous deux de rendez-vous décevants mais
// expriment deux intentions différentes. Aucun seuil ne peut à la fois retenir
// les vraies familles et écarter celle-là, puisqu'elle les domine toutes.
// C'est pourquoi le regroupement ne DÉCIDE rien : il propose des candidats que
// l'étape de nommage (Claude, dans la route) peut élaguer ou rejeter, et que
// le manager valide en dernier ressort.
const DEFAULT_MIN_CLUSTER_SIZE = 2;

// Réglables pour pouvoir sonder un jeu de données réel (« que se passe-t-il à
// 0.68 ? à partir de 2 membres ? ») sans toucher au comportement de la route,
// qui garde les valeurs par défaut ci-dessus.
export type ClusteringOptions = { similarityThreshold?: number; minClusterSize?: number };

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

function centroid(vectors: number[][]): number[] {
  const dimensions = vectors[0]?.length ?? 0;
  const sum = new Array<number>(dimensions).fill(0);
  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i++) sum[i] += vector[i];
  }
  return sum.map((v) => v / vectors.length);
}

// Regroupement glouton autour d'un centroïde recalculé à chaque ajout, et non
// par lien simple : le lien simple enchaîne (A proche de B, B proche de C, donc
// A et C dans le même groupe alors qu'ils n'ont rien à voir), ce qui produit
// exactement le genre de fourre-tout qu'on cherche à éviter ici.
export function clusterObjections(
  objections: ClusterableObjection[],
  options: ClusteringOptions = {}
): ObjectionCluster[] {
  const threshold = options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const minSize = options.minClusterSize ?? DEFAULT_MIN_CLUSTER_SIZE;

  const remaining = objections.filter((o) => o.embedding.length > 0);
  if (remaining.length < minSize) return [];

  const assigned = new Set<string>();
  const clusters: ObjectionCluster[] = [];

  // On démarre chaque groupe par l'objection qui a le plus de voisins proches :
  // partir d'un élément central donne des groupes plus nets que de partir du
  // premier venu.
  const neighbourCount = new Map<string, number>();
  for (const a of remaining) {
    let count = 0;
    for (const b of remaining) {
      if (a.id !== b.id && cosineSimilarity(a.embedding, b.embedding) >= threshold) count++;
    }
    neighbourCount.set(a.id, count);
  }
  const seeds = [...remaining].sort((a, b) => (neighbourCount.get(b.id) ?? 0) - (neighbourCount.get(a.id) ?? 0));

  for (const seed of seeds) {
    if (assigned.has(seed.id)) continue;

    const members = [seed];
    let center = seed.embedding;

    // Plusieurs passes : une objection écartée au début peut devenir proche du
    // centre une fois celui-ci déplacé par les ajouts suivants.
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of remaining) {
        if (assigned.has(candidate.id) || members.some((m) => m.id === candidate.id)) continue;
        if (cosineSimilarity(center, candidate.embedding) >= threshold) {
          members.push(candidate);
          center = centroid(members.map((m) => m.embedding));
          changed = true;
        }
      }
    }

    if (members.length < minSize) continue;
    for (const member of members) assigned.add(member.id);

    const similarities = members.map((m) => cosineSimilarity(center, m.embedding));
    const representative = members[similarities.indexOf(Math.max(...similarities))];

    clusters.push({
      members: members.map(({ id, objection, verbatim }) => ({ id, objection, verbatim })),
      representative: representative.objection,
      cohesion: similarities.reduce((sum, s) => sum + s, 0) / similarities.length,
    });
  }

  // Les groupes les plus nombreux d'abord : c'est le volume qui justifie de
  // créer une catégorie, pas la cohésion.
  return clusters.sort((a, b) => b.members.length - a.members.length);
}
