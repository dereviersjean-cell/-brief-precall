import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import { getBriefByEventId, getBriefByIdForUser, updateBriefMeetingContext } from "@/lib/db";
import { cleanMeetingContext } from "@/lib/meeting-origin";

// Le contexte du rendez-vous d'un brief : d'où il vient et pourquoi le
// prospect l'a accepté (demande d'Hubert, 12/11/2026). Saisi par le
// commercial tant que Brief ne le lit pas dans HubSpot. Ne relance pas la
// génération : l'accroche en tiendra compte à la prochaine.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { id: rawId } = await params;
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    // Segment mal encodé : on garde la forme reçue.
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  const meetingContext = cleanMeetingContext(body);
  if (!meetingContext) {
    return NextResponse.json({ error: "Choisissez une origine ou écrivez une phrase." }, { status: 400 });
  }

  // Même double forme d'identifiant que la page du brief : l'événement
  // d'agenda d'abord, l'uuid du brief en repli (seule requête sur une colonne
  // uuid, d'où le garde).
  try {
    const byEvent = (await getBriefByEventId(auth.userId, id)) as { id: string } | null;
    const briefId = byEvent?.id ?? (isUuid(id) && (await getBriefByIdForUser(id, auth.userId)) ? id : null);
    if (!briefId) return NextResponse.json({ error: "Brief introuvable." }, { status: 404 });
    await updateBriefMeetingContext(auth.userId, briefId, meetingContext);
    return NextResponse.json({ meetingContext });
  } catch (err) {
    console.error("[briefs/context] échec :", err);
    return NextResponse.json({ error: "Enregistrement impossible. Réessayez." }, { status: 500 });
  }
}
