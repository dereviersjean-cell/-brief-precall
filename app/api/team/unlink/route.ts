import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { unlinkManagerFromCommercial } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const role = auth.role;
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const { commercialId } = (await request.json()) as { commercialId?: string };
  if (!commercialId) {
    return NextResponse.json({ error: "commercialId requis." }, { status: 400 });
  }

  try {
    await unlinkManagerFromCommercial(userId, commercialId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors du délien.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
