import { NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { setForcedAnalysis } from "@/lib/db";
import { syncAndScheduleForUser } from "@/lib/recall";
import { reportWarning } from "@/lib/monitoring";

// « Analyser quand même » sur un rendez-vous repéré comme non commercial
// (migration 041) : le robot est programmé à la synchronisation qui suit,
// lancée tout de suite plutôt que d'attendre le passage des 5 minutes.
// `{ force: false }` rend le rendez-vous à la règle (le robot est retiré).
export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { eventId } = await params;
  // Identifiant d'événement Google ou Microsoft : texte libre, borné.
  if (!eventId || eventId.length > 1024) {
    return NextResponse.json({ error: "Rendez-vous inconnu." }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { force?: unknown };
  const force = body.force !== false;

  try {
    await setForcedAnalysis(auth.userId, eventId, force);
  } catch (err) {
    console.error("[calendar/analysis] setForcedAnalysis failed:", err);
    return NextResponse.json({ error: "Impossible d'enregistrer ce choix pour le moment." }, { status: 500 });
  }

  const userEmail = session?.user?.email ?? "";
  if (userEmail) {
    after(() =>
      syncAndScheduleForUser(auth.userId, userEmail).catch((err) => reportWarning("calendar.analysis-sync", err, { userId: auth.userId }))
    );
  }
  return NextResponse.json({ ok: true, forced: force });
}
