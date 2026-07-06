import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getBriefsByUser } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  try {
    const briefs = await getBriefsByUser(userId);
    console.log("[briefs] userId:", userId, "— count:", briefs?.length ?? 0);
    return NextResponse.json(briefs ?? []);
  } catch (err) {
    console.error("[briefs] getBriefsByUser failed:", err);
    return NextResponse.json([], { status: 200 });
  }
}
