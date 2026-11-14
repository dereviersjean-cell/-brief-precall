import { DEAL_MEMORY_FIELDS, type AiDealAdvice, type DealMemoryFieldKey, type DealMemoryItem } from "./deal-memory-schema";
import { MAX_STAGES, qualificationFields, type DealRules, type QualificationKey } from "./deal-rules";

// Les objectifs d'un rendez-vous. Depuis le 14/11/2026 ils suivent l'ÉTAPE
// COMMERCIALE du deal et non plus le numéro du rendez-vous (réponse d'Hubert à
// E1, validée par Jean) : le manager fixe ce qu'il faut obtenir pendant chaque
// étape (lib/deal-rules.ts, `stageRequirements`). `level` = l'étape où en est
// le deal (`stageLevel`) ; `rank` ne sert plus qu'aux libellés « R2 ». Après
// le call, Brief dit ce qui a été obtenu ; avant le suivant, ce qu'il reste à
// aller chercher.
//
// Une information n'est obtenue que si le prospect l'a dite clairement
// (`level: "confirme"`, lib/deal-memory.ts) : « on a un budget, mais pas
// 18 000 € » reste à préciser. Ce qui n'est pas obtenu au rendez-vous prévu
// est reporté au suivant. Règles fixes, sans appel IA ; sans dépendance,
// importable côté client et testé.

export type Level = "confirme" | "evoque";
export type ItemsByField = Partial<Record<DealMemoryFieldKey, DealMemoryItem[]>>;

// obtenu = confirmé pendant ce call ; a_preciser = abordé sans réponse nette ;
// pas_aborde = personne n'en a parlé ; deja_obtenu = confirmé à un call
// précédent (objectif du rang, rien à aller chercher).
export type ObjectiveStatus = "obtenu" | "a_preciser" | "pas_aborde" | "deja_obtenu";

export type ObjectiveRow = {
  key: QualificationKey;
  label: string;
  status: ObjectiveStatus;
  // Reporté d'un rendez-vous précédent, où il n'avait pas été obtenu.
  carried: boolean;
  // Ce qui le montre : l'élément de ce call, sinon le plus récent connu.
  item: DealMemoryItem | null;
};

export type NextItem = {
  key: QualificationKey;
  label: string;
  // a_preciser = abordé sans réponse nette ; reporte = objectif d'un
  // rendez-vous précédent jamais abordé ; nouveau = objectif de ce rendez-vous.
  reason: "a_preciser" | "reporte" | "nouveau";
  // Ce qu'on en sait déjà, quand le sujet a été abordé.
  known: DealMemoryItem | null;
  question: string;
};

const LABELS = new Map<string, string>(DEAL_MEMORY_FIELDS.map((f) => [f.key, f.label]));

// Pour une information jamais abordée.
const OPEN_QUESTIONS: Record<QualificationKey, string> = {
  douleur: "Qu'est-ce qui vous coûte le plus aujourd'hui dans votre façon de faire ?",
  impact: "Si rien ne change, combien cela vous coûte-t-il sur l'année ?",
  decideur: "Au-delà de vous, qui signera, et peut-il être présent au prochain échange ?",
  champion: "Qui, en interne, porte ce projet avec vous ?",
  criteres: "Sur quels critères allez-vous comparer les solutions ?",
  processus: "Quelles sont les étapes jusqu'à la signature, et avec qui ?",
  budget: "Quelle enveloppe avez-vous prévue pour ce sujet ?",
  echeance: "Pour quand voulez-vous que ce soit en place, et pourquoi cette date ?",
  concurrents: "Quelles autres options regardez-vous, y compris faire en interne ?",
};

// Pour une information abordée sans réponse nette : on part de ce qui a été
// dit pour obtenir le chiffre, le nom ou la date qui manque.
const PRECISE_QUESTIONS: Record<QualificationKey, string> = {
  douleur: "Concrètement, sur quel point ce problème vous gêne-t-il le plus aujourd'hui ?",
  impact: "Pouvez-vous le chiffrer : combien de temps ou d'argent cela représente-t-il par mois ?",
  decideur: "Qui, précisément, signera, et comment l'associer au prochain échange ?",
  champion: "Qui, chez vous, va défendre ce projet quand nous ne serons pas là ?",
  criteres: "Parmi ces critères, lequel pèsera le plus dans votre choix ?",
  processus: "Qui intervient à chaque étape, et quelle date visez-vous pour signer ?",
  budget: "Pour avancer, quelle enveloppe pouvez-vous engager, même en fourchette ?",
  echeance: "Quelle date retenez-vous pour démarrer, et qu'est-ce qui la fixe ?",
  concurrents: "Où en êtes-vous avec les autres options, et qu'est-ce qui vous ferait choisir ?",
};

export function label(key: QualificationKey): string {
  return LABELS.get(key) ?? key;
}

// Un élément sans niveau vient d'une fiche antérieure : il comptait comme
// connu, il le reste.
export function itemLevel(item: DealMemoryItem): Level {
  return item.level ?? "confirme";
}

function bestLevel(items: DealMemoryItem[] | undefined): Level | null {
  if (!items || items.length === 0) return null;
  return items.some((i) => itemLevel(i) === "confirme") ? "confirme" : "evoque";
}

// Le meilleur élément à montrer : un confirmé d'abord.
function bestItem(items: DealMemoryItem[] | undefined): DealMemoryItem | null {
  if (!items || items.length === 0) return null;
  return items.find((i) => itemLevel(i) === "confirme") ?? items[0];
}

export function objectiveLevel(level: number): number {
  return Math.max(1, Math.min(MAX_STAGES, level));
}

// Les objectifs d'une étape, limités aux champs de la méthode de l'organisation.
export function objectivesForLevel(rules: DealRules, level: number): QualificationKey[] {
  const fields = new Set(qualificationFields(rules));
  return (rules.stageRequirements[objectiveLevel(level)] ?? []).filter((k) => fields.has(k));
}

function objectivesUpTo(rules: DealRules, level: number): { key: QualificationKey; level: number }[] {
  const seen = new Set<QualificationKey>();
  const result: { key: QualificationKey; level: number }[] = [];
  for (let l = 1; l <= objectiveLevel(level); l++) {
    for (const key of objectivesForLevel(rules, l)) {
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ key, level: l });
    }
  }
  return result;
}

// Le bilan d'un call tenu à l'étape `level` : les objectifs de cette étape,
// plus ceux des étapes précédentes qui n'avaient pas été obtenus. Sans
// `level`, le rang en tient lieu (deal hors HubSpot).
export function reviewCallObjectives(input: { rank: number; level?: number; current: ItemsByField; prior: ItemsByField; rules: DealRules }): ObjectiveRow[] {
  const own = objectiveLevel(input.level ?? input.rank);
  const rows: ObjectiveRow[] = [];
  for (const { key, level } of objectivesUpTo(input.rules, own)) {
    const before = bestLevel(input.prior[key]);
    const carried = level < own;
    // Un objectif d'une étape précédente déjà obtenu n'est plus un objectif.
    if (carried && before === "confirme") continue;
    const now = bestLevel(input.current[key]);
    const status: ObjectiveStatus =
      now === "confirme" ? "obtenu" : before === "confirme" ? "deja_obtenu" : now === "evoque" ? "a_preciser" : "pas_aborde";
    // Déjà obtenu : ce qui le montre est l'élément confirmé d'avant, pas ce
    // que ce call en a dit de plus flou.
    const item = status === "deja_obtenu" ? bestItem(input.prior[key]) : bestItem(input.current[key]) ?? bestItem(input.prior[key]);
    rows.push({ key, label: label(key), status, carried, item });
  }
  return rows;
}

// Ce qu'il faut aller chercher au prochain call, le deal étant à l'étape
// `level` : tout objectif des étapes 1 à `level` qui n'est pas encore
// confirmé — à préciser d'abord, puis reporté des étapes précédentes, puis
// ceux de l'étape. Quand tout est obtenu, les objectifs de l'étape suivante :
// c'est ce qui fait avancer le deal.
export function nextCallPlan(input: { lastRank: number; level?: number; known: ItemsByField; rules: DealRules }): { rank: number; items: NextItem[] } {
  const rank = input.lastRank + 1;
  const level = objectiveLevel(input.level ?? input.lastRank);
  const build = (list: { key: QualificationKey; level: number }[]): NextItem[] =>
    list.flatMap(({ key, level: from }) => {
      const known = bestLevel(input.known[key]);
      if (known === "confirme") return [];
      const reason: NextItem["reason"] = known === "evoque" ? "a_preciser" : from < level ? "reporte" : "nouveau";
      return [
        {
          key,
          label: label(key),
          reason,
          known: known === "evoque" ? bestItem(input.known[key]) : null,
          question: `« ${reason === "a_preciser" ? PRECISE_QUESTIONS[key] : OPEN_QUESTIONS[key]} »`,
        },
      ];
    });
  let items = build(objectivesUpTo(input.rules, level));
  if (items.length === 0) items = build(objectivesForLevel(input.rules, level + 1).map((key) => ({ key, level: level + 1 })));
  const order = { a_preciser: 0, reporte: 1, nouveau: 2 };
  items.sort((a, b) => order[a.reason] - order[b.reason]);
  return { rank, items };
}

// Ce que les fiches d'un deal savent, jusqu'à un call compris : tous les
// éléments, du plus récent au plus ancien.
export function mergeKnown(fiches: ItemsByField[]): ItemsByField {
  const result: ItemsByField = {};
  for (const fields of [...fiches].reverse()) {
    for (const [key, items] of Object.entries(fields) as [DealMemoryFieldKey, DealMemoryItem[]][]) {
      result[key] = [...(result[key] ?? []), ...items];
    }
  }
  return result;
}

// Le nom d'une information dans une phrase : « le budget », « l'échéance ».
const IN_SENTENCE: Record<QualificationKey, string> = {
  douleur: "la douleur",
  impact: "l'impact chiffré",
  decideur: "le décideur",
  champion: "l'allié chez le client",
  criteres: "les critères de décision",
  processus: "le processus de décision",
  budget: "le budget",
  echeance: "l'échéance",
  concurrents: "les alternatives envisagées",
};

function list(keys: QualificationKey[]): string {
  const words = keys.map((k) => IN_SENTENCE[k]);
  return words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} et ${words.at(-1)}`;
}

// Le message au commercial, en clair et au tutoiement (décision de Jean du
// 27/10/2026) : ce que le dernier call a obtenu, ce qui reste flou, ce qu'il
// faut aller chercher au prochain. Les questions, elles, s'adressent au
// prospect et restent au vouvoiement.
export function objectivesMessage(review: ObjectiveRow[], plan: { rank: number; items: NextItem[] }, lastRank: number): string[] {
  const keys = (status: ObjectiveStatus) => review.filter((r) => r.status === status).map((r) => r.key);
  const got = keys("obtenu");
  const vague = keys("a_preciser");
  const missed = keys("pas_aborde");
  const lines: string[] = [];
  if (got.length > 0) lines.push(`Au R${lastRank}, tu as obtenu ${list(got)} : c'est bon.`);
  if (vague.length > 0) lines.push(`Encore flou : ${list(vague)}.`);
  if (missed.length > 0) lines.push(`Pas abordé : ${list(missed)}.`);
  if (plan.items.length > 0) lines.push(`Au R${plan.rank}, va chercher ${list(plan.items.map((i) => i.key))}.`);
  else lines.push(`Au R${plan.rank}, les objectifs fixés sont déjà obtenus : concentre-toi sur la suite du deal.`);
  return lines;
}

export type StoredQuestions = { rank: number; questions: Partial<Record<string, string>>; advice?: AiDealAdvice | null };

// Les questions rédigées par Haiku après le dernier call (migration 037),
// quand elles visent bien ce rendez-vous ; la question fixe sinon, information
// par information.
export function applyQuestions(plan: { rank: number; items: NextItem[] }, stored: StoredQuestions | null | undefined): { rank: number; items: NextItem[] } {
  if (!stored || stored.rank !== plan.rank) return plan;
  return { ...plan, items: plan.items.map((i) => ({ ...i, question: stored.questions[i.key] ?? i.question })) };
}

export type DealObjectives = { lastRank: number; review: ObjectiveRow[]; plan: { rank: number; items: NextItem[] }; message: string[] };

// Les objectifs d'un deal après son call de rang `fiches.length` : `fiches`
// = les champs de chaque call, du plus ancien au plus récent. Sert la page
// du call, le brief du suivant et Mes deals.
export function dealObjectives(fiches: ItemsByField[], rules: DealRules, stored?: StoredQuestions | null, level?: number): DealObjectives | null {
  if (fiches.length === 0) return null;
  return objectivesAt(fiches.length, fiches[fiches.length - 1], mergeKnown(fiches.slice(0, -1)), rules, stored, level);
}

// La même chose pour un call de rang `rank` dont on a déjà fusionné ce que les
// calls précédents savaient (la page d'un call).
export function objectivesAt(rank: number, current: ItemsByField, prior: ItemsByField, rules: DealRules, stored?: StoredQuestions | null, level?: number): DealObjectives {
  const review = reviewCallObjectives({ rank, level, current, prior, rules });
  const plan = applyQuestions(nextCallPlan({ lastRank: rank, level, known: mergeKnown([prior, current]), rules }), stored);
  return { lastRank: rank, review, plan, message: objectivesMessage(review, plan, rank) };
}

// Une information abordée sans réponse nette, sur tout le deal : rien de
// confirmé, au moins un élément évoqué.
export function isVague(items: DealMemoryItem[] | undefined): boolean {
  return bestLevel(items) === "evoque";
}
