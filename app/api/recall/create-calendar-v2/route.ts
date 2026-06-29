import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createRecallCalendarV2 } from "@/lib/recall";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const refreshToken = session?.refreshToken;
  if (!refreshToken) {
    return NextResponse.json(
      { error: "Aucun refresh token Google disponible. Reconnectez-vous via Google." },
      { status: 400 }
    );
  }

  try {
    const calendar = await createRecallCalendarV2(userId, refreshToken);
    return NextResponse.json({
      ok: true,
      calendarId: calendar.id,
      status: (calendar as Record<string, unknown>).status ?? null,
    });
  } catch (err) {
    console.error("[create-calendar-v2] createRecallCalendarV2 failed:", err);
    return NextResponse.json({ error: "Erreur lors de la création du calendrier." }, { status: 500 });
  }
}
