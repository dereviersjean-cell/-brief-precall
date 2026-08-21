import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getImpersonationTarget } from "@/lib/impersonation";
import { getBillingGateForUser } from "@/lib/db";

// Lecture seule, accessible à tout user actif (pas manager-only) — la
// bannière de fenêtre de grâce doit être visible par toute l'organisation,
// pas seulement le manager qui gère la facturation.
//
// N'utilise volontairement PAS requireActiveUser : ce garde lit `users` pour
// le seul `disabled_at`, alors que la requête qui suit relit la même ligne.
// Cette route étant appelée à chaque chargement de page, elle résout les deux
// en un seul aller-retour. Les 401/403 restent identiques, impersonation
// comprise.
export async function GET() {
  const startedAt = Date.now();

  const impersonationTarget = await getImpersonationTarget();
  const session = impersonationTarget ? null : await getServerSession(authOptions);
  const userId = impersonationTarget?.id ?? session?.supabaseUserId;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const afterAuth = Date.now();

  const gate = await getBillingGateForUser(userId);
  const afterQuery = Date.now();

  // getImpersonationTarget a déjà écarté une cible désactivée ; ce test couvre
  // la session ordinaire, comme le faisait requireActiveUser.
  if (!gate || (!impersonationTarget && gate.disabledAt != null)) {
    return NextResponse.json({ error: "Votre compte a été désactivé." }, { status: 403 });
  }

  // Instrumentation temporaire (21/08/2026) : la région d'exécution a été
  // ramenée à Paris sans que la durée bouge (883 ms → 1,01 s), donc on veut
  // savoir ce qui coûte — la résolution de session ou la requête. À retirer
  // une fois la réponse obtenue.
  console.log(
    `[billing/status] session=${afterAuth - startedAt}ms query=${afterQuery - afterAuth}ms total=${Date.now() - startedAt}ms`
  );

  return NextResponse.json({
    status: gate.billingStatus ?? "none",
    graceEndsAt: gate.graceEndsAt ?? null,
  });
}
