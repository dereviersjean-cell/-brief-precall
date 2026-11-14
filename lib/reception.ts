import type { NotificationChannel, NotificationEventType } from "./notification-preferences";

// Paramètres › Réception (maquette A choisie par Jean le 14/11/2026, décision
// A5) : ce que l'équipe reçoit et où. Sans dépendance : importé par l'écran,
// la route et l'envoi des alertes. L'application reçoit toujours tout ;
// HubSpot se règle à part.

// Les alertes sur un deal ne sont pas un événement des préférences
// personnelles (/notifications) : elles partent par défaut, et seule une case
// décochée ici les coupe.
export const DEAL_ALERT_EVENT = "alerte_deal";

export type ReceptionEvent = NotificationEventType | typeof DEAL_ALERT_EVENT;
export type ReceptionChannel = Extract<NotificationChannel, "email" | "slack">;

// defaultOn : actif tant que personne ne l'a coupé (les autres ne partent que
// si la case est cochée).
export const RECEPTION_EVENTS: { key: ReceptionEvent; label: string; detail: string; defaultOn: boolean }[] = [
  { key: "brief_precall", label: "Brief avant le rendez-vous", detail: "Dès qu'il est préparé.", defaultOn: false },
  { key: "analyse_postcall", label: "Analyse après le call", detail: "Quelques minutes après la fin du rendez-vous.", defaultOn: false },
  { key: DEAL_ALERT_EVENT, label: "Alertes sur un deal", detail: "Après un call qui met le deal à risque.", defaultOn: true },
];

export const RECEPTION_CHANNELS: { key: ReceptionChannel; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "slack", label: "Slack" },
];
