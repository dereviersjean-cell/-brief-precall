// La personne que contacte une inscription libre (accès « briefs »,
// lib/modules.ts) pour aller au-delà des briefs. Un seul endroit à changer si
// quelqu'un d'autre prend le relais.
//
// Le lien est une page de réservation Cal.com : le prospect choisit lui-même
// un créneau, Cal.com vérifie les conflits dans l'agenda Outlook connecté et
// génère le lien visio.
//
// ⚠ Pourquoi Cal.com et pas Google Agenda (26/11/2026) : l'ancien lien
// (calendar.app.google/acNSvvWyFbh4nQaq7) répondait « Appointment not found »
// — le planning avait disparu, et les neuf boutons du site pointaient dessus.
// La reprise sur une adresse @joinbriefai.com était impossible côté Google :
// ce domaine est sur Microsoft 365 (MX outlook.com, DMARC p=reject), c'est un
// des domaines Zapmail des campagnes.
//
// `email` reste l'adresse brief-ai.fr sur demande de Jean, en sachant qu'elle
// rebondit tant que le Workspace du domaine n'est pas monté (voir CLAUDE.md,
// « Le MX de brief-ai.fr est passé chez Google »). `firstName` reste Hubert :
// c'est le nom du profil Cal.com, même si l'agenda connecté est celui de
// Maxime.
export const SALES_CONTACT = {
  firstName: "Hubert",
  email: "hubert.delalance@brief-ai.fr",
  bookingUrl: "https://cal.com/hubert-helvkl/30min",
} as const;

// Plafond quotidien de briefs en accès « briefs », par utilisateur.
export const BRIEFS_ACCESS_DAILY_LIMIT = 10;
