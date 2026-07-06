import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserProfile, upsertUserProfile } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);

  if (!auth.ok) {
    // Non authentifié ou désactivé — on laisse le dashboard gérer la redirection login
    return NextResponse.json({ hasProfile: true, profile: null });
  }
  const userId = auth.userId;

  try {
    const profile = await getUserProfile(userId);
    return NextResponse.json({ hasProfile: profile !== null, profile });
  } catch {
    return NextResponse.json({ hasProfile: true, profile: null });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  try {
    const { company_name, product_description, icp, sector } = await request.json();
    await upsertUserProfile(userId, { company_name, product_description, icp, sector });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[onboarding] upsertUserProfile failed:", err);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });
  }
}
