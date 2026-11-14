import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { getOrganizationUserIds, setTeamNotificationPreference } from "@/lib/db";
import { RECEPTION_CHANNELS, RECEPTION_EVENTS } from "@/lib/reception";

// Paramètres › Réception : le manager règle pour toute l'équipe où arrivent le
// brief et l'analyse (décision A5 du 13/11/2026). Écrit la même préférence
// chez chaque membre actif de son organisation.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  if (auth.role !== "manager" || !auth.organizationId) {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  let body: { event_type?: string; channel?: string; enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  const event = RECEPTION_EVENTS.find((e) => e.key === body.event_type);
  const channel = RECEPTION_CHANNELS.find((c) => c.key === body.channel);
  if (!event || !channel || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Réglage invalide." }, { status: 400 });
  }

  try {
    const userIds = await getOrganizationUserIds(auth.userId);
    await setTeamNotificationPreference(userIds, event.key, channel.key, body.enabled);
    return NextResponse.json({ ok: true, members: userIds.length });
  } catch (err) {
    console.error("[notification-preferences/team] échec :", err);
    return NextResponse.json({ error: "Enregistrement impossible. Réessayez." }, { status: 500 });
  }
}
