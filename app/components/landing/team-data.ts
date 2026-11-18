// Équipe d'exemple de la landing : quatre commerciaux fictifs, cohérents avec
// le reste de la page (Thomas suit le deal Valdor ; Julie et Karim sont cités
// dans le bilan de la semaine). Portraits générés par IA (Higgsfield,
// 12/10/2026).
// Les notes par dimension, tendances et métriques d'interaction qui vivaient
// ici ont été retirées le 18/11/2026 avec l'aperçu Performance : l'app n'a
// plus de note sur 5 ni de pages Performance depuis le 05/11/2026.

export type Rep = { id: string; name: string; first: string; role: string; photo: string };

export const REPS: Rep[] = [
  { id: "thomas", name: "Thomas Lefèvre", first: "Thomas", role: "Account executive", photo: "/landing/people/avatar-thomas.jpg" },
  { id: "julie", name: "Julie Marchand", first: "Julie", role: "Account executive", photo: "/landing/people/avatar-julie.jpg" },
  { id: "karim", name: "Karim Benali", first: "Karim", role: "Business developer", photo: "/landing/people/avatar-karim.jpg" },
  { id: "lea", name: "Léa Fontaine", first: "Léa", role: "Commerciale, arrivée en septembre", photo: "/landing/people/avatar-lea.jpg" },
];

export const rep = (id: string) => REPS.find((r) => r.id === id) ?? REPS[0];

export const NB = " ";
