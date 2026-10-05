import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getAccessForUser } from "@/lib/db";
import { resolveEnabledModules } from "@/lib/modules";

// Modules actifs et niveau d'accès de l'utilisateur affiché (impersonation
// comprise), lus par ModulesProvider pour masquer menus, onglets et cartes.
// Purement visuel : le vrai verrou est dans le middleware (pages et routes
// d'API).
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  // Même repli que le middleware sur erreur d'infrastructure : rien ne se
  // ferme.
  const access = await getAccessForUser(auth.userId).catch(() => ({
    modules: resolveEnabledModules(null),
    accessLevel: "full" as const,
    needsCompany: false,
  }));
  return NextResponse.json(
    { modules: access.modules, briefsOnly: access.accessLevel === "briefs" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
