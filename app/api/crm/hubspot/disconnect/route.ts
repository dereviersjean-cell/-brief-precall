import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { deleteCrmTokens } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    await deleteCrmTokens(userId, "hubspot");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[hubspot/disconnect]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Erreur lors de la déconnexion." }, { status: 500 });
  }
}
