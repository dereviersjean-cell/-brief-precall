import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getRecentBriefsForUser } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  try {
    // Seul consommateur : la page Brief sans données serveur (5 récents).
    const briefs = await getRecentBriefsForUser(userId, 5);
    return NextResponse.json(briefs);
  } catch (err) {
    console.error("[briefs] getBriefsByUser failed:", err);
    return NextResponse.json([], { status: 200 });
  }
}
