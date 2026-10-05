// La personne que contacte une inscription libre (accès « briefs »,
// lib/modules.ts) pour aller au-delà des briefs. Un seul endroit à changer si
// quelqu'un d'autre prend le relais.
//
// Le lien est un planning de rendez-vous Google Agenda : le prospect choisit
// lui-même un créneau, l'invitation part dans l'agenda de Hubert.
export const SALES_CONTACT = {
  firstName: "Hubert",
  email: "hubert.delalance@brief-ai.fr",
  bookingUrl: "https://calendar.app.google/acNSvvWyFbh4nQaq7",
} as const;

// Plafond quotidien de briefs en accès « briefs », par utilisateur.
export const BRIEFS_ACCESS_DAILY_LIMIT = 10;
