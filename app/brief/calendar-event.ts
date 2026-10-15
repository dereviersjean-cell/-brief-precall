// Un rendez-vous tel que la page Brief le manipule (agenda synchronisé ou
// RDV ajouté à la main). Partagé entre la liste et ses fenêtres modales.
export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees: Array<{ name?: string; email: string }>;
  // Présents uniquement sur un RDV ajouté à la main (pas de bot Recall, pas
  // d'écriture dans un vrai agenda — voir migration 012). `company` est le
  // nom saisi explicitement à la création : contrairement à un événement de
  // calendrier réel, on ne le devine jamais depuis un domaine email.
  manual?: boolean;
  company?: string;
  // Le nom saisi à la création. Il ne peut pas voyager dans `attendees` :
  // un invité au sens agenda a forcément une adresse, or ici le nom seul
  // suffit à retrouver la personne dans l'annuaire (nom + entreprise).
  contactName?: string;
}
