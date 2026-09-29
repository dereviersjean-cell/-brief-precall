import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getEnabledModulesForUser } from "@/lib/db";

// Modules actifs de l'utilisateur affiché (impersonation comprise), lus par
// ModulesProvider pour masquer menus, onglets et cartes. Purement visuel : le
// vrai verrou est dans le middleware (pages et routes d'API).
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const modules = await getEnabledModulesForUser(auth.userId);
  return NextResponse.json({ modules }, { headers: { "Cache-Control": "no-store" } });
}
