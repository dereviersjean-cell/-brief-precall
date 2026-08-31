import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUpcomingMeetings } from "@/lib/calendar";

export async function GET() {
  const session = await getServerSession(authOptions);

  // `requireActiveUser` et pas seulement la présence d'une session : c'est lui
  // qui applique `disabled_at` et le blocage de facturation. Le middleware ne
  // couvre que des pages, jamais /api — cette route gardait donc un compte
  // désactivé ou une organisation suspendue en état de marche.
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const provider = session.provider ?? "google";
  const userEmail = session.user?.email ?? "";

  try {
    const events = await getUpcomingMeetings(session.accessToken, provider, userEmail);
    return NextResponse.json(events);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur calendrier";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
