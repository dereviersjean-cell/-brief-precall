import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getImpersonationTarget } from "@/lib/impersonation";
import { getChromeStateForUser, getActiveSeatCountForOrganization } from "@/lib/db";

// Une seule route pour tout l'habillage : sidebar, bannière de facturation,
// bannière d'impersonation.
//
// Elle remplace /api/sidebar/org-status, /api/settings/billing/status et
// /api/impersonation-status. Chacune était une fonction serverless distincte,
// donc un démarrage à froid distinct — mesuré à ~850 ms le 21/08/2026, contre
// 204 ms de code utile. Trois composants montés sur chaque page payaient donc
// trois fois ce démarrage pour afficher un nom d'organisation et deux
// bannières le plus souvent invisibles.
//
// Côté client, les trois composants appellent cette URL via fetchJsonOnce :
// le cache de module les fait partager UN seul appel réseau par chargement de
// page, sans qu'ils aient à se coordonner.
export async function GET() {
  // L'impersonation d'abord : la bannière rouge doit fonctionner avec le seul
  // cookie d'impersonation, sans session NextAuth — c'était déjà la règle de
  // l'ancienne route, et elle est délibérée.
  const impersonationTarget = await getImpersonationTarget();
  const session = impersonationTarget ? null : await getServerSession(authOptions);
  const userId = impersonationTarget?.id ?? session?.supabaseUserId;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const state = await getChromeStateForUser(userId);

  // getImpersonationTarget a déjà écarté une cible désactivée ; ce test couvre
  // la session ordinaire, comme le faisait requireActiveUser.
  if (!state || (!impersonationTarget && state.disabledAt != null)) {
    return NextResponse.json({ error: "Votre compte a été désactivé." }, { status: 403 });
  }

  // Le nombre de sièges ne s'affiche que sur la carte d'essai : inutile de
  // payer une requête de plus le reste du temps.
  const seatCount =
    state.billingStatus === "trialing" && state.organizationId
      ? await getActiveSeatCountForOrganization(state.organizationId)
      : 0;

  return NextResponse.json({
    impersonation: impersonationTarget
      ? { active: true, targetUserName: impersonationTarget.name ?? impersonationTarget.email }
      : { active: false },
    organizationName: state.organizationName,
    billingStatus: state.billingStatus ?? "none",
    trialEndsAt: state.trialEndsAt,
    graceEndsAt: state.graceEndsAt,
    seatCount,
  });
}
