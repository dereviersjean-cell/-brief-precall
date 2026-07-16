export type NotificationEventType = "brief_precall" | "analyse_postcall";
export type NotificationChannel = "email" | "calendar" | "hubspot" | "pipedrive" | "slack";

// Quels canaux sont disponibles pour quel type d'événement
export const AVAILABLE_CHANNELS: Record<NotificationEventType, NotificationChannel[]> = {
  brief_precall: ["email", "calendar", "hubspot", "pipedrive", "slack"],
  analyse_postcall: ["email", "hubspot", "pipedrive", "slack"], // pas de calendar pour l'analyse
};

// Métadonnées d'affichage (label + description + statut d'implémentation)
export const CHANNEL_META: Record<NotificationChannel, { label: string; description: string; implemented: boolean }> = {
  email: {
    label: "Email",
    description: "Envoyé sur votre boîte mail connectée",
    implemented: true, // sous-étape B
  },
  calendar: {
    label: "Calendrier",
    description: "Ajouté à la description de l'événement",
    implemented: true, // sous-étape B — voir lib/google-calendar.ts pour le
    // blocage de scope OAuth qui empêche l'écriture effective pour l'instant
  },
  hubspot: {
    label: "HubSpot",
    description: "Note ajoutée sur le meeting du deal",
    implemented: true, // sous-étape C — voir lib/crm/hubspot.ts pour le
    // scope OAuth (notes.write/meetings.write) qui nécessite une
    // reconnexion pour les connexions existantes
  },
  pipedrive: {
    label: "Pipedrive",
    description: "Note ajoutée sur l'activité du deal",
    implemented: true, // sous-étape C2 — voir lib/crm/pipedrive.ts pour les
    // scopes (deals:full/contacts:full/activities:full) qui nécessitent une
    // reconnexion pour les connexions existantes
  },
  slack: {
    label: "Slack",
    description: "Message privé envoyé sur votre workspace",
    implemented: true, // sous-étape D — voir lib/slack.ts. Connexion par
    // utilisateur (chacun connecte son propre compte Slack, comme
    // HubSpot/Pipedrive), pas une install unique au niveau workspace.
  },
};

export type NotificationPreference = {
  event_type: NotificationEventType;
  channel: NotificationChannel;
  enabled: boolean;
};

// Expands whatever rows actually exist in notification_preferences into the
// full (event_type, channel) grid — every combination AVAILABLE_CHANNELS
// allows, defaulting to enabled: false for anything not in `existing`. Used
// by both GET /api/notification-preferences and the settings page's server
// component, so a user who has never touched a toggle sees a complete list
// of off switches rather than an empty one.
export function expandPreferences(existing: NotificationPreference[]): NotificationPreference[] {
  const existingByKey = new Map(existing.map((p) => [`${p.event_type}:${p.channel}`, p.enabled]));
  const eventTypes = Object.keys(AVAILABLE_CHANNELS) as NotificationEventType[];
  return eventTypes.flatMap((eventType) =>
    AVAILABLE_CHANNELS[eventType].map((channel) => ({
      event_type: eventType,
      channel,
      enabled: existingByKey.get(`${eventType}:${channel}`) ?? false,
    }))
  );
}
