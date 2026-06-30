import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getRecallCalendarId, clearRecallCalendarId } from "@/lib/db";
import { deleteRecallCalendar } from "@/lib/recall";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const calendarId = await getRecallCalendarId(userId);
  if (!calendarId) {
    return NextResponse.json({ ok: true });
  }

  try {
    await deleteRecallCalendar(calendarId);
  } catch (err) {
    console.error("[recall/disconnect] deleteRecallCalendar failed (clearing DB anyway):", err instanceof Error ? err.message : String(err));
  }

  await clearRecallCalendarId(userId);
  return NextResponse.json({ ok: true });
}
