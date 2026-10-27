import { REP_ACTIONS } from "./deal-board";
import type { DealProgress } from "./deal-progress";
import type { QualificationKey } from "./deal-rules";

// Le conseil affiché pour un deal dans « Mes deals » (version D3 « coach »,
// choisie par Jean le 27/10/2026 : rester en posture de conseil actionnable).
// Quatre parties qui portent toutes sur la MÊME action : quoi faire,
// pourquoi (avec la phrase du call quand il y en a une), comment le dire,
// pour quand. Tiré des fiches par des règles fixes, sans appel IA. Sans
// dépendance : importé par l'écran et testé.

// La question à poser pour obtenir chaque information de qualification.
// Génériques à dessein : une spécificité client vit dans sa configuration,
// pas dans ce texte partagé.
export const QUALIFICATION_QUESTIONS: Record<QualificationKey, string> = {
  douleur: "Qu'est-ce qui vous coûte le plus aujourd'hui dans votre façon de faire ?",
  impact: "Si rien ne change, combien cela vous coûte-t-il sur l'année ?",
  decideur: "Au-delà de vous, qui validera la décision et le budget ?",
  champion: "Qui, en interne, porte ce projet avec vous ?",
  criteres: "Sur quels critères allez-vous comparer les solutions ?",
  processus: "Quelles sont les étapes jusqu'à la signature, et avec qui ?",
  budget: "Quelle enveloppe avez-vous prévue pour ce sujet ?",
  echeance: "Pour quand voulez-vous que ce soit en place, et pourquoi cette date ?",
  concurrents: "Quelles autres options regardez-vous, y compris faire en interne ?",
};

export type DealAdvice = {
  title: string;
  why: string;
  quote: { text: string; speaker: string | null } | null;
  // Ce que le commercial peut faire ou dire, phrases prêtes quand c'est
  // possible (entre guillemets).
  how: string[];
  when: string;
};

function longDay(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function adviceFor(d: DealProgress): DealAdvice {
  const nextWhen = d.nextStep.date ? `Avant le ${longDay(d.nextStep.date)}` : "Au prochain échange";

  if (d.focus.status === "relancer") {
    return {
      title: d.focus.action,
      why: `${d.focus.detail ? d.focus.detail.charAt(0).toUpperCase() + d.focus.detail.slice(1) : "Plus de nouvelles"}. Sans relance, le deal risque de refroidir.`,
      quote: d.nextStep.text ? { text: d.nextStep.text, speaker: "Engagement pris au dernier call" } : null,
      how: [
        "Rappeler l'engagement pris au dernier call, puis proposer un créneau précis cette semaine.",
        `« Je reviens vers vous suite à notre échange du ${d.lastCall.at ? longDay(d.lastCall.at) : "dernier call"} : seriez-vous disponible mardi ou jeudi pour faire le point ? »`,
      ],
      when: "Aujourd'hui",
    };
  }

  // Critère de passage : le pourquoi et le comment portent sur l'information
  // manquante, pas sur une autre alerte du call.
  if (d.missingForStage.length > 0 && d.focus.action.startsWith("Obtenir")) {
    const how = d.missingKeys.slice(0, 2).map((k) => `« ${QUALIFICATION_QUESTIONS[k]} »`);
    if (d.topAlert) how.push(`Autre point du dernier call — ${lowerFirst(d.topAlert.label)} : ${lowerFirst(REP_ACTIONS[d.topAlert.rule as keyof typeof REP_ACTIONS] ?? d.topAlert.text)}`);
    return {
      title: d.focus.action,
      why: `Le deal est à l'étape « ${d.hubspot?.stage ?? `R${d.steps.length}`} », mais ${d.missingForStage.map(lowerFirst).join(", ")} n'est toujours pas connu après ${d.steps.length} call${d.steps.length > 1 ? "s" : ""}. Sans cette information, la suite peut bloquer au dernier moment.`,
      quote: null,
      how,
      when: nextWhen,
    };
  }

  if (d.focus.action === "Dater la prochaine étape") {
    return {
      title: d.focus.action,
      why: "Le dernier call s'est terminé sans date pour la suite : c'est le premier signe d'un deal qui s'enlise.",
      quote: d.nextStep.text ? { text: d.nextStep.text, speaker: "Ce qui a été dit sur la suite" } : null,
      how: ["« Pour avancer, je vous propose qu'on cale dès maintenant le prochain point : plutôt en début ou en fin de semaine prochaine ? »"],
      when: "Aujourd'hui",
    };
  }

  if (d.topAlert) {
    const how = [REP_ACTIONS[d.topAlert.rule as keyof typeof REP_ACTIONS] ?? d.topAlert.text];
    for (const k of d.missingKeys.slice(0, 1)) how.push(`« ${QUALIFICATION_QUESTIONS[k]} »`);
    return {
      title: d.focus.action,
      why: d.topAlert.text,
      quote: d.topAlert.quote ? { text: d.topAlert.quote, speaker: d.topAlert.speaker } : null,
      how,
      when: nextWhen,
    };
  }

  // En bonne voie : préparer le prochain call sur ce qui manque encore.
  return {
    title: d.focus.action,
    why: d.missingKeys.length > 0 ? `Le deal avance. Il reste à obtenir : ${d.toObtain.map(lowerFirst).join(", ")}.` : "Le deal avance et la qualification est complète.",
    quote: null,
    how: d.missingKeys.length > 0 ? d.missingKeys.slice(0, 2).map((k) => `« ${QUALIFICATION_QUESTIONS[k]} »`) : ["Faire valider la proposition et fixer la date de signature."],
    when: d.nextStep.date ? `Le ${longDay(d.nextStep.date)}` : "Au prochain échange",
  };
}
