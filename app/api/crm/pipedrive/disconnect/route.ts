import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { deleteCrmTokens } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  try {
    await deleteCrmTokens(userId, "pipedrive");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pipedrive/disconnect]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Erreur lors de la déconnexion." }, { status: 500 });
  }
}
