import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, linkManagerToCommercial } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const role = await getUserRole(userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const { commercialId } = (await request.json()) as { commercialId?: string };
  if (!commercialId) {
    return NextResponse.json({ error: "commercialId requis." }, { status: 400 });
  }

  try {
    await linkManagerToCommercial(userId, commercialId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors du rattachement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
