import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUpcomingMeetings } from "@/lib/calendar";

export async function GET() {
  const session = await getServerSession(authOptions);

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
