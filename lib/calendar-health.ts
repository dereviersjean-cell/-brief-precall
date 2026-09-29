import { getRecallCalendarHealth, deleteRecallCalendar } from "./recall";
import {
  getStoredRecallCalendarStatus,
  setRecallCalendarStatus,
  getUserName,
  getRecallCalendarId,
  saveRecallCalendarId,
} from "./db";
import { sendCalendarDisconnectedEmail } from "./email";
import { reportWarning } from "./monitoring";

// Santé de l'agenda d'un utilisateur, vérifiée à chaque synchronisation des
// 5 minutes (syncRecallCalendars, lib/inngest-functions.ts).
//
// Brief tenait un agenda pour connecté dès que recall_calendar_id existait.
// Celui d'un commercial est resté coupé du 27/07 au 29/09/2026 (jeton Google
// expiré au bout de 7 jours, limite du mode Testing de l'époque), affiché
// « Agenda connecté », sans un seul call enregistré — découvert par hasard
// sur l'écran Équipe. Désormais : l'état réel est enregistré (migration 018),
// l'écran Équipe et Paramètres > Connexions le montrent, et le commercial
// reçoit un email au moment de la coupure.

// PostgREST : colonne inconnue — la migration 018 n'est pas encore passée.
// Attendu tant qu'elle n'a pas été exécutée : ni alerte, ni email.
function isMissingColumn(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "42703" || code === "PGRST204";
}

export async function checkCalendarHealth(user: {
  id: string;
  email: string;
  recall_calendar_id: string;
}): Promise<{ disconnected: boolean }> {
  const health = await getRecallCalendarHealth(user.recall_calendar_id);
  // Recall injoignable : on ne conclut rien, la synchronisation continue.
  if (!health) return { disconnected: false };
  const disconnected = health.status === "disconnected";

  try {
    const previous = await getStoredRecallCalendarStatus(user.id);
    if (previous === health.status) return { disconnected };

    if (disconnected) {
      const name = await getUserName(user.id).catch(() => null);
      await sendCalendarDisconnectedEmail({
        to: user.email,
        firstName: name?.trim().split(/\s+/)[0] ?? null,
        disconnectedAt: health.since,
      });
      console.log(`[calendar-health] agenda coupé pour ${user.id}, email envoyé`);
    }
    await setRecallCalendarStatus(user.id, health.status, health.since ?? new Date().toISOString());
  } catch (err) {
    if (!isMissingColumn(err)) {
      reportWarning("calendar-health", err, { userId: user.id, status: health.status });
    }
  }

  return { disconnected };
}

// Enregistre l'agenda qu'un utilisateur vient de (re)brancher. Jusqu'ici le
// nouvel identifiant écrasait l'ancien et l'agenda précédent restait chez
// Recall, orphelin. Désormais il est supprimé, et l'état passe tout de suite
// à « connected » : sans ça, le badge « Agenda déconnecté » survivrait à la
// reconnexion jusqu'à la synchronisation suivante — le lundi matin pour une
// reconnexion faite le dimanche. Seul l'enregistrement du nouvel identifiant
// est bloquant ; le reste est du ménage.
export async function saveReconnectedCalendar(userId: string, calendarId: string): Promise<void> {
  const previousId = await getRecallCalendarId(userId).catch(() => null);
  await saveRecallCalendarId(userId, calendarId);

  await setRecallCalendarStatus(userId, "connected", new Date().toISOString()).catch((err) => {
    if (!isMissingColumn(err)) reportWarning("calendar-health.markConnected", err, { userId });
  });
  if (previousId && previousId !== calendarId) {
    await deleteRecallCalendar(previousId).catch((err) =>
      reportWarning("calendar-health.deletePrevious", err, { userId, previousId })
    );
  }
}
