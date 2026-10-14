import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { loadUpcomingEvents } from "@/lib/upcoming-events";

export async function GET() {
  const session = await getServerSession(authOptions);

  // `requireActiveUser` et pas seulement la présence d'une session : c'est lui
  // qui applique `disabled_at` et le blocage de facturation. Le middleware ne
  // couvre que des pages, jamais /api — cette route gardait donc un compte
  // désactivé ou une organisation suspendue en état de marche.
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const result = await loadUpcomingEvents(session, auth.userId);
  return result.ok ? NextResponse.json(result.events) : NextResponse.json({ error: result.error }, { status: result.status });
}
