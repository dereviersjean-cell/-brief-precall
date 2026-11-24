import { NextRequest, NextResponse } from "next/server";
import { APP_URL } from "@/lib/app-url";
import { setOrganizationMicrosoftConsent } from "@/lib/db";
import { verifyConsentState } from "@/lib/microsoft-admin-consent";
import { reportError, reportWarning } from "@/lib/monitoring";

// Retour de l'écran de consentement administrateur Microsoft.
//
// ⚠ AUCUNE SESSION ICI, et c'est voulu : celui qui arrive sur cette route est
// l'administrateur informatique du client, dans son propre navigateur. Il n'a
// pas de compte Brief, et aucun cookie posé au départ (le manager, lui, était
// sur une autre machine). L'organisation vient donc de l'état signé de l'URL
// (lib/microsoft-admin-consent.ts) : sans signature valide, on n'écrit rien.
//
// Il repart sur /microsoft-autorise, une page publique : le renvoyer dans
// l'app le ferait rebondir sur /login, qu'il ne saurait pas passer.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const done = (etat: string) => NextResponse.redirect(`${APP_URL}/microsoft-autorise?etat=${etat}`);

  // L'accord d'abord, l'état ensuite — et pas l'inverse : un administrateur
  // qui vient d'accorder l'accès ne doit jamais lire « lien invalide ». Un
  // accord sans état signé arrive pour de bon : le lien offert à un
  // commercial bloqué n'en porte pas (il n'a pas de compte, donc pas
  // d'organisation). L'entreprise est débloquée côté Microsoft, Brief ne peut
  // simplement pas l'inscrire — c'est ce que dit « accorde-non-enregistre ».
  const granted = (params.get("admin_consent") ?? "").toLowerCase() === "true";
  const secret = process.env.NEXTAUTH_SECRET;
  const state = verifyConsentState(params.get("state"), secret ?? "");

  if (!granted) {
    reportWarning("microsoft.admin_consent", new Error(params.get("error") ?? "accord refusé"), {
      description: params.get("error_description") ?? undefined,
    });
    // Un refus sur un lien dont l'état ne vaut rien : le lien lui-même est le
    // problème à signaler, pas le refus.
    return done(state ? "refus" : "lien-invalide");
  }

  if (!state) {
    reportWarning("microsoft.admin_consent", new Error("accord sans état signé : non attribuable"), {
      tenant: params.get("tenant") ?? undefined,
    });
    return done("accorde-non-enregistre");
  }

  try {
    await setOrganizationMicrosoftConsent(state.organizationId, {
      // Microsoft renvoie le tenant qui a consenti ; il ne donne pas
      // l'administrateur, d'où grantedBy null (l'écran ne promet donc pas de
      // nom qu'on n'a pas).
      tenant: params.get("tenant") ?? "inconnu",
      grantedAt: new Date().toISOString(),
      grantedBy: null,
    });
  } catch (err) {
    // La migration 045 n'est peut-être pas passée : l'accord EST donné côté
    // Microsoft, seul son enregistrement a échoué. On le dit, plutôt que de
    // faire croire à un refus.
    reportError("microsoft.admin_consent", err, { organizationId: state.organizationId });
    return done("accorde-non-enregistre");
  }

  return done("ok");
}
