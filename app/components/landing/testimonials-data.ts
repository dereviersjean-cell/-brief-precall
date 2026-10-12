import { NB } from "./team-data";

// Témoignages de la landing.
//
// UN SEUL EST RÉEL : Camille Duval (confirmé par Jean le 12/10/2026, accord
// pour une photo illustrative). Tous les autres sont INVENTÉS — personnes,
// entreprises, citations et chiffres — pour une maquette discutée en interne
// (demande de Jean du 12/10/2026 : « le site n'est pas montré à des clients »).
// Leurs portraits sont générés par IA et ne représentent personne.
//
// Garde-fou : `fictional: true` les retire du build de PRODUCTION
// (VERCEL_ENV === "production", cf. `visibleTestimonials`). Publier un avis
// inventé comme s'il était vrai est une pratique commerciale trompeuse : avant
// toute mise en ligne, les remplacer par de vrais témoignages validés par
// chaque personne, puis passer `fictional` à false.

export type Testimonial = {
  name: string;
  role: string;
  company: string;
  /** Couleur du monogramme d'entreprise. */
  color: string;
  photo: string;
  /** Début de la citation en encre, suite en gris. */
  quote: [string, string];
  /** Chiffre clé, pour les cartes. */
  metric?: { value: string; label: string };
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
    // Photo d'illustration (générée) : Camille Duval a donné son accord pour
    // qu'une photo quelconque accompagne ses mots (Jean, 12/10/2026). À
    // remplacer par son vrai portrait si elle le fournit.
    // Ses mots ; seuls les tirets de ponctuation ont été remplacés par des virgules.
    quote: [
      "On sait enfin pourquoi on gagne un deal, et pourquoi on en perd.",
      `Nos commerciaux arrivent préparés, et les objections ne prennent plus personne de court.`,
    ],
    fictional: false,
  },
  {
    name: "Marc Lefort",
    role: "Directeur commercial",
    company: "Norvane Équipements",
    color: "#0B6B58",
    photo: "/landing/people/temoignage-marc.jpg",
    quote: [
      "Avant, le point du lundi reposait sur des impressions.",
      `Aujourd'hui on regarde tous les mêmes chiffres, et chaque commercial sait ce qu'il a à travailler dans la semaine.`,
    ],
    fictional: true,
  },
  {
    name: "Sarah Ndiaye",
    role: "Dirigeante",
    company: "Kestria Conseil",
    color: "#9A3FB0",
    photo: "/landing/people/temoignage-sarah.jpg",
    quote: [
      "Mes consultants arrivent en rendez-vous en connaissant déjà l'actualité du client.",
      `Ça se sent dès la première minute, et toute la suite de l'échange en profite.`,
    ],
    fictional: true,
  },
];

/** Cartes à chiffre clé, sous le carrousel. */
export const CARDS: Testimonial[] = [
  {
    name: "Nicolas Benali",
    role: "Sales manager",
    company: "Solvéo",
    color: "#C2453A",
    photo: "/landing/people/temoignage-nicolas.jpg",
    quote: [
      "Le brief arrive directement dans l'invitation de l'agenda.",
      `Personne n'a eu à changer ses habitudes pour s'en servir.`,
    ],
    metric: { value: `20${NB}min`, label: "gagnées sur la préparation de chaque rendez-vous" },
    fictional: true,
  },
  {
    name: "Aurélie Fontaine",
    role: "Directrice commerciale",
    company: "Transports Lamaury",
    color: "#1E6FA8",
    photo: "/landing/people/temoignage-aurelie.jpg",
    quote: [
      "Les nouveaux réécoutent comment l'équipe traite chaque objection.",
      `Ils sont autonomes en rendez-vous bien plus tôt qu'avant.`,
    ],
    metric: { value: "×2", label: "plus rapide pour rendre un nouveau commercial autonome" },
    fictional: true,
  },
  {
    name: "Julien Moreau",
    role: "Fondateur",
    company: "Studio Ardent",
    color: "#B7791F",
    photo: "/landing/people/temoignage-julien.jpg",
    quote: [
      "Je n'écoute plus les calls à l'aveugle.",
      `Je vais directement aux deux minutes qui comptent, et j'en parle avec le commercial le jour même.`,
    ],
    metric: { value: `100${NB}%`, label: "des calls notés sur la grille de l'agence" },
    fictional: true,
  },
];

/** Retire les témoignages inventés du build de production (cf. en-tête). */
export function visibleTestimonials(list: Testimonial[]): Testimonial[] {
  if (process.env.VERCEL_ENV === "production") return list.filter((t) => !t.fictional);
  return list;
}
