import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { syncAndScheduleForUser } from "@/lib/recall";

export async function POST() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;
  const userEmail = session?.user?.email ?? "";

  if (!userEmail) {
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
