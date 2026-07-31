import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { searchEverything } from "@/lib/db";

// Recherche globale de la TopBar. Pas de `checkAiGenerationRateLimit` : aucune
// génération IA ici, et la route est appelée à chaque frappe (débouncée côté
// client) — la soumettre au quota de génération le viderait en quelques
// recherches.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    return NextResponse.json({ results: await searchEverything(auth.userId, query) });
  } catch (err) {
    console.error("[search] searchEverything failed:", err instanceof Error ? err.message : String(err));
    // Une recherche qui échoue ne doit pas afficher d'erreur bloquante dans la
    // barre de navigation : liste vide, l'utilisateur reformule.
    return NextResponse.json({ results: [] });
  }
}
