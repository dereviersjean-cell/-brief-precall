import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { disconnectSlack } from "@/lib/slack";

export async function POST() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  try {
    await disconnectSlack(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[slack/disconnect]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Erreur lors de la déconnexion." }, { status: 500 });
  }
}
