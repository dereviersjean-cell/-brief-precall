import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { syncAndScheduleForUser } from "@/lib/recall";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  const userEmail = session?.user?.email ?? "";

  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const result = await syncAndScheduleForUser(userId, userEmail);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[sync-and-schedule] syncAndScheduleForUser failed:", err);
    return NextResponse.json({ error: "Erreur lors de la synchronisation." }, { status: 500 });
  }
}
