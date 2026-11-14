import type { NotificationChannel, NotificationEventType } from "./notification-preferences";

// Paramètres › Réception (maquette A choisie par Jean le 14/11/2026, décision
// A5) : ce que l'équipe reçoit et où. Sans dépendance : importé par l'écran et
// par la route. L'application reçoit toujours tout ; HubSpot se règle à part.
export const RECEPTION_EVENTS: { key: NotificationEventType; label: string; detail: string }[] = [
  { key: "brief_precall", label: "Brief avant le rendez-vous", detail: "Dès qu'il est préparé." },
  { key: "analyse_postcall", label: "Analyse après le call", detail: "Quelques minutes après la fin du rendez-vous." },
];

export const RECEPTION_CHANNELS: { key: Extract<NotificationChannel, "email" | "slack">; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "slack", label: "Slack" },
];
