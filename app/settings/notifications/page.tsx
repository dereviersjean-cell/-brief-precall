import { redirect } from "next/navigation";
import { getNotificationPreferencesForUser } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import { expandPreferences } from "@/lib/notification-preferences";
import NotificationSettingsClient from "./NotificationSettingsClient";

export default async function NotificationSettingsPage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  // expandPreferences fills in enabled: false for every (event_type,
  // channel) combo with no row yet — a user who has never opened this page
  // gets a full grid of off toggles, not an empty list.
  const existing = await getNotificationPreferencesForUser(userId);
  const preferences = expandPreferences(existing);

  return <NotificationSettingsClient initialPreferences={preferences} />;
}
