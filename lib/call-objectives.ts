import { DEAL_MEMORY_FIELDS, type AiDealAdvice, type DealMemoryFieldKey, type DealMemoryItem } from "./deal-memory-schema";
import { OBJECTIVE_RANKS, qualificationFields, type DealRules, type QualificationKey } from "./deal-rules";

// Les objectifs de chaque rendez-vous (demande de Jean du 27/10/2026) : le
// manager fixe ce que le commercial doit aller chercher au R1, au R2, au R3
// (lib/deal-rules.ts, `callObjectives`). Après le call, Brief dit ce qui a été
// obtenu ; avant le suivant, il dit au commercial « au dernier call tu es allé
// chercher ça, c'est bon ; maintenant va chercher ça, ça et ça ».
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

export function objectiveRank(rank: number): number {
  return Math.max(1, Math.min(OBJECTIVE_RANKS, rank));
}

// Les objectifs d'un rang, limités aux champs de la méthode de l'organisation.
export function objectivesForRank(rules: DealRules, rank: number): QualificationKey[] {
  const fields = new Set(qualificationFields(rules));
  return (rules.callObjectives[objectiveRank(rank)] ?? []).filter((k) => fields.has(k));
}

function objectivesUpTo(rules: DealRules, rank: number): { key: QualificationKey; rank: number }[] {
  const seen = new Set<QualificationKey>();
  const result: { key: QualificationKey; rank: number }[] = [];
  for (let r = 1; r <= objectiveRank(rank); r++) {
    for (const key of objectivesForRank(rules, r)) {
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ key, rank: r });
    }
  }
  return result;
}

// Le bilan d'un call de rang `rank` (1 = R1) : ses objectifs, plus ceux des
// rendez-vous précédents qui n'avaient pas été obtenus.
export function reviewCallObjectives(input: { rank: number; current: ItemsByField; prior: ItemsByField; rules: DealRules }): ObjectiveRow[] {
  const own = objectiveRank(input.rank);
  const rows: ObjectiveRow[] = [];
  for (const { key, rank } of objectivesUpTo(input.rules, own)) {
    const before = bestLevel(input.prior[key]);
    const carried = rank < own;
    // Un objectif d'un rendez-vous précédent déjà obtenu n'est plus un
    // objectif.
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

// Ce qu'il faut aller chercher au prochain call, après le call de rang
// `lastRank` : tout objectif des rendez-vous 1 à lastRank + 1 qui n'est pas
// encore confirmé, à préciser d'abord, puis reporté, puis nouveau.
export function nextCallPlan(input: { lastRank: number; known: ItemsByField; rules: DealRules }): { rank: number; items: NextItem[] } {
  const rank = input.lastRank + 1;
  const items: NextItem[] = [];
  for (const { key, rank: from } of objectivesUpTo(input.rules, rank)) {
    const level = bestLevel(input.known[key]);
    if (level === "confirme") continue;
    const reason: NextItem["reason"] = level === "evoque" ? "a_preciser" : from <= input.lastRank ? "reporte" : "nouveau";
    items.push({
      key,
      label: label(key),
      reason,
      known: level === "evoque" ? bestItem(input.known[key]) : null,
      question: `« ${reason === "a_preciser" ? PRECISE_QUESTIONS[key] : OPEN_QUESTIONS[key]} »`,
    });
  }
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
  champion: "le champion",
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
export function dealObjectives(fiches: ItemsByField[], rules: DealRules, stored?: StoredQuestions | null): DealObjectives | null {
  if (fiches.length === 0) return null;
  return objectivesAt(fiches.length, fiches[fiches.length - 1], mergeKnown(fiches.slice(0, -1)), rules, stored);
}

// La même chose pour un call de rang `rank` dont on a déjà fusionné ce que les
// calls précédents savaient (la page d'un call).
export function objectivesAt(rank: number, current: ItemsByField, prior: ItemsByField, rules: DealRules, stored?: StoredQuestions | null): DealObjectives {
  const review = reviewCallObjectives({ rank, current, prior, rules });
  const plan = applyQuestions(nextCallPlan({ lastRank: rank, known: mergeKnown([prior, current]), rules }), stored);
  return { lastRank: rank, review, plan, message: objectivesMessage(review, plan, rank) };
}

// Une information abordée sans réponse nette, sur tout le deal : rien de
// confirmé, au moins un élément évoqué.
export function isVague(items: DealMemoryItem[] | undefined): boolean {
  return bestLevel(items) === "evoque";
}
