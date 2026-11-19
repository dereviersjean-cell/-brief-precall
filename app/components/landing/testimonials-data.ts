// Témoignages de la landing.
//
// Tous RÉELS : Camille Duval (confirmé par Jean le 12/10/2026) et les huit
// autres (transmis par Jean le 13/10/2026, accord de chaque personne pour être
// citée sous son nom, avec un portrait généré par IA). Les citations sont leurs
// mots, à la typographie près. Les entreprises restent décrites, pas nommées,
// comme elles nous ont été transmises.
//
// Les portraits sont des illustrations générées, pas leurs vraies photos : la
// section l'indique sous les témoignages. À remplacer par leurs vrais
// portraits s'ils les fournissent.
//
// Retirés du site le 19/11/2026 (historique git) : quatre témoignages réels qui
// décrivent des fonctions que l'app n'a plus — Isabelle Roche (scores par
// dimension), Sophie Garnier (notation par étape), Julien Perrin (playbook
// importé depuis Notion, grille de critères), Nadia Chevalier (« mes scores »).
// Une citation ne se réécrit pas : à leur redemander si on veut les republier.
//
// Garde-fou conservé : `fictional: true` retire un témoignage du build de
// PRODUCTION (VERCEL_ENV === "production", cf. `visibleTestimonials`). Publier
// un avis inventé comme s'il était vrai est une pratique commerciale
// trompeuse : tout témoignage de maquette doit porter ce drapeau.

export type Testimonial = {
  name: string;
  role: string;
  company: string;
  /** Couleur de la pastille d'entreprise. */
  color: string;
  photo: string;
  /** Début de la citation en encre, suite en gris. */
  quote: [string, string];
  fictional: boolean;
};

/** Grands témoignages du carrousel, dans l'ordre d'affichage. */
export const FEATURED: Testimonial[] = [
  {
    name: "Camille Duval",
    role: "Head of Sales",
    company: "éditeur SaaS B2B",
    color: "#2A5CE0",
    photo: "/landing/people/temoignage-camille-grand.jpg",
    // Ses mots ; seuls les tirets de ponctuation ont été remplacés par des virgules.
    quote: [
      "On sait enfin pourquoi on gagne un deal, et pourquoi on en perd.",
      `Nos commerciaux arrivent préparés, et les objections ne prennent plus personne de court.`,
    ],
    fictional: false,
  },
  {
    name: "Antoine Lemaire",
    role: "Directeur commercial",
    company: "ESN de 200 personnes",
    color: "#0B6B58",
    photo: "/landing/people/temoignage-antoine.jpg",
    quote: [
      "Avant, mes commerciaux passaient vingt minutes à fouiller LinkedIn et Pappers avant chaque rendez-vous.",
      `Aujourd'hui, le brief arrive la veille, ils le lisent en trois minutes et ils ouvrent avec une vraie accroche.`,
    ],
    fictional: false,
  },
];

/** Cartes sous le carrousel. */
export const CARDS: Testimonial[] = [
  {
    name: "Mehdi Bouaziz",
    role: "Account Executive",
    company: "plateforme logistique B2B",
    color: "#C2453A",
    photo: "/landing/people/temoignage-mehdi.jpg",
    quote: [
      "La bibliothèque d'objections, c'est mon meilleur collègue.",
      `Quand un prospect me sort une objection que je n'ai jamais traitée, je retrouve comment l'équipe y a répondu et ce qui a marché.`,
    ],
    fictional: false,
  },
  {
    name: "Olivier Masson",
    role: "VP Sales",
    company: "distributeur de matériel médical",
    color: "#2F5D8A",
    photo: "/landing/people/temoignage-olivier.jpg",
    quote: [
      "Les huit semaines d'accompagnement ont été décisives.",
      `On n'a pas juste installé un outil, on a structuré notre méthode de vente, brique par brique.`,
    ],
    fictional: false,
  },
  {
    name: "Clara Benoît",
    role: "Responsable commerciale",
    company: "agence marketing B2B",
    color: "#B4485E",
    photo: "/landing/people/temoignage-clara.jpg",
    quote: [
      "Le débrief arrive juste après le call, avec la prochaine étape déjà formulée.",
      `Plus rien ne se perd entre deux rendez-vous, et nos relances partent le jour même.`,
    ],
    fictional: false,
  },
];

/** Retire les témoignages inventés du build de production (cf. en-tête). */
export function visibleTestimonials(list: Testimonial[]): Testimonial[] {
  if (process.env.VERCEL_ENV === "production") return list.filter((t) => !t.fictional);
  return list;
}
