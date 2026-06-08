import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getBriefsByUser } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const briefs = await getBriefsByUser(userId);
    console.log("[briefs] userId:", userId, "— count:", briefs?.length ?? 0, "— raw:", JSON.stringify(briefs));
    return NextResponse.json(briefs ?? []);
  } catch (err) {
    console.error("[briefs] getBriefsByUser failed:", err);
    return NextResponse.json([], { status: 200 });
  }
}
