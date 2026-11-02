import type { DealProgress } from "./deal-progress";

// Le conseil au manager sur l'onglet Équipe de « Deals de l'équipe » (version
// M3 choisie par Jean le 27/10/2026, même esprit que le conseil de « Mes
// deals », lib/deal-advice.ts) : faut-il intervenir, pourquoi, et quoi dire
// au commercial. Le manager ne reprend jamais le deal : il pose des questions
// au commercial. Sans dépendance, importable côté client.

export type InterventionLevel = "oui" | "surveiller" | "non";
export const INTERVENTION_ORDER: InterventionLevel[] = ["oui", "surveiller", "non"];

// Un deal qui recule demande d'intervenir ; un deal à relancer ou à traiter
// se surveille ; un deal en bonne voie n'a besoin de rien.
export function interventionLevel(d: DealProgress): InterventionLevel {
  if (d.verdict === "recul") return "oui";
  return d.focus.status === "bonne_voie" ? "non" : "surveiller";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

// « de Velbrun », « d'Atelier Brunet ».
export function withDe(name: string): string {
  return /^[aeiouyhàâéèêîôû]/i.test(name) ? `d'${name}` : `de ${name}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// Le conseil Haiku du dernier call (lib/deal-advice-ai.ts, 28/10/2026) prime
// sur les règles fixes dès qu'il y a quelque chose à faire.
function aiManager(d: DealProgress) {
  return interventionLevel(d) !== "non" ? (d.aiAdvice?.manager ?? null) : null;
}

export function managerTitle(d: DealProgress, owner: string): string {
  const ai = aiManager(d);
  if (ai) return ai.title;
  const level = interventionLevel(d);
  if (level === "oui") return `Parler ${withDe(d.name)} avec ${firstName(owner)}`;
  if (level === "surveiller") return `Garder un œil : ${lowerFirst(d.focus.action)}`;
  return "Pas besoin d'intervenir";
}

export function managerWhy(d: DealProgress): string {
  const ai = aiManager(d);
  if (ai) return d.focus.status === "relancer" && d.focus.detail ? `${capitalize(d.focus.detail)}. ${ai.why}` : ai.why;
  if (d.focus.status === "relancer") return `${d.focus.detail ? capitalize(d.focus.detail) : "Plus de nouvelles du prospect"} : le deal refroidit.`;
  if (d.missingForStage.length > 0) {
    const missing = d.missingForStage.join(", ").toLowerCase();
    return `Le deal a avancé sans ${missing}.`;
  }
  if (d.topAlert) return d.topAlert.text;
  return "Le deal avance normalement.";
}

// Les questions à poser au commercial, la plus urgente d'abord (3 au plus).
export function coachingQuestions(d: DealProgress): string[] {
  const q: string[] = [];
  if (d.focus.status === "relancer") q.push(`« Où en es-tu avec ${d.name} ? Qu'est-ce qui t'empêche de le relancer cette semaine ? »`);
  const ai = aiManager(d);
  if (ai) return [...new Set([...q, ...ai.questions])].slice(0, 3);
  if (d.missingForStage.length > 0) {
    q.push(`« Le deal a avancé sans ${d.missingForStage.join(", ").toLowerCase()}. Comment comptes-tu l'obtenir au prochain échange ? »`);
  }
  switch (d.topAlert?.rule) {
    case "objection_recurrente":
      q.push(`« L'objection revient au R${d.steps.length}. Qu'as-tu répondu la dernière fois, et que pourrais-tu dire autrement ? »`);
      q.push("« Veux-tu qu'on prépare ensemble ta réponse avant le prochain call ? »");
      break;
    case "decideur_toujours_absent":
    case "decideur_absent":
      q.push("« Comment pourrais-tu faire venir le décideur au prochain call ? Veux-tu que je l'appelle avec toi ? »");
      break;
    case "sentiment_en_baisse":
      q.push("« Qu'est-ce qui a changé depuis le call précédent, selon toi ? »");
      break;
    case "concurrent_evoque":
      q.push("« Qu'est-ce qui nous distingue de cette alternative pour ce prospect ? »");
      break;
    case "objection_cachee":
      q.push("« As-tu senti une réserve ? On réécoute le passage ensemble ? »");
      break;
    case "preuve_sociale":
      q.push("« Quel cas client pourrais-tu lui envoyer ? Je peux t'aider à en trouver un. »");
      break;
    case "interlocuteur_manquant":
      q.push("« Qui d'autre doit être convaincu, et comment le faire venir ? »");
      break;
    case "prochaine_etape_non_datee":
      q.push("« Quelle date peux-tu proposer au prospect pour la suite ? »");
      break;
  }
  if (q.length === 0) q.push(`« Qu'est-ce qui t'aiderait à avancer sur ${d.name} ? »`);
  return [...new Set(q)].slice(0, 3);
}

// Le point qui revient sur au moins deux deals du même commercial : un
// réflexe à installer, pas un accident.
export function recurringWeakPoint(deals: DealProgress[]): { label: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const d of deals) for (const a of new Set(d.alerts)) counts.set(a, (counts.get(a) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top && top[1] >= 2 ? { label: top[0], count: top[1] } : null;
}

// Le conseil sur une personne, quand le manager filtre sur elle.
export function personAdvice(name: string, deals: DealProgress[]): { title: string; why: string; questions: string[] } {
  const first = firstName(name);
  const weak = recurringWeakPoint(deals);
  const toFollow = deals.filter((d) => interventionLevel(d) !== "non");
  const late = toFollow.filter((d) => d.focus.status === "relancer").map((d) => d.name);
  const questions: string[] = [];
  if (weak) questions.push(`« Sur tes deals, « ${lowerFirst(weak.label)} » revient souvent. Comment t'y prends-tu aujourd'hui ? »`);
  if (late.length > 0) {
    questions.push(`« Où en es-tu avec ${late.slice(0, 3).join(", ")}${late.length > 3 ? "…" : ""} ? Lequel relances-tu en premier, et quand ? »`);
  }
  const other = toFollow.find((d) => d.focus.status !== "relancer");
  if (other) questions.push(coachingQuestions(other)[0]);

  const title = weak
    ? `Travailler avec ${first} : ${lowerFirst(weak.label)}`
    : toFollow.length > 0
      ? `Faire le point avec ${first} sur ${toFollow.length} deal${toFollow.length > 1 ? "s" : ""}`
      : `Rien à signaler pour ${first}`;
  const why = [
    weak ? `Ce point revient sur ${weak.count} de ses ${deals.length} deals : c'est un réflexe à installer, pas un accident.` : "",
    toFollow.length > 0 ? `${toFollow.length} deal${toFollow.length > 1 ? "s demandent" : " demande"} un suivi.` : "Ses deals avancent.",
  ]
    .filter(Boolean)
    .join(" ");
  return { title, why, questions: questions.slice(0, 3) };
}
