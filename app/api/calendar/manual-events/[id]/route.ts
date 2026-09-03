import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import { deleteManualMeeting } from "@/lib/db";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  // manual_meetings.id est une colonne uuid — un id malformé lèverait une
  // 22P02 remontée en 500 (cf. règle isUuid du projet).
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 404 });
  }

  try {
    await deleteManualMeeting(auth.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[calendar/manual-events] deleteManualMeeting failed:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}
