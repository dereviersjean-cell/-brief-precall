import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { attachSelfServeOrganization, getAccessForUser, getUserProfile, upsertUserProfile } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);

  if (!auth.ok) {
    // Non authentifié ou désactivé — on laisse le dashboard gérer la redirection login
    return NextResponse.json({ hasProfile: true, profile: null });
  }
  const userId = auth.userId;

  try {
    const [profile, access] = await Promise.all([getUserProfile(userId), getAccessForUser(userId)]);
    // Une inscription libre sans entreprise n'a pas fini son onboarding, même
    // si une ligne de profil existe déjà (étapes enregistrées en chemin).
    return NextResponse.json({
      hasProfile: profile !== null && !access.needsCompany,
      profile,
      needsCompany: access.needsCompany,
      briefsOnly: access.accessLevel === "briefs",
    });
  } catch {
    return NextResponse.json({ hasProfile: true, profile: null });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  let body: { company_name?: unknown; product_description?: unknown; icp?: unknown; sector?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide." }, { status: 400 });
  }
  const { company_name, product_description, icp, sector } = body as Record<string, string | undefined>;

  try {
    // Inscription libre : le compte est rattaché à son entreprise ici, et
    // nulle part ailleurs. Sans nom, l'onboarding ne peut pas se terminer — le
    // middleware y ramène tant que ce n'est pas fait.
    const access = await getAccessForUser(userId);
    if (access.needsCompany) {
      const companyName = typeof company_name === "string" ? company_name.trim() : "";
      if (!companyName) {
        return NextResponse.json({ error: "Indiquez le nom de votre entreprise pour continuer." }, { status: 400 });
      }
      await attachSelfServeOrganization(userId, companyName.slice(0, 200));
    }

    await upsertUserProfile(userId, { company_name, product_description, icp, sector });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[onboarding] save failed:", err);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });
  }
}
