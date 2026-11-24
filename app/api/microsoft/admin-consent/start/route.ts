import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { APP_URL } from "@/lib/app-url";
import { buildAdminConsentUrl, resolveMicrosoftTenant, signConsentState } from "@/lib/microsoft-admin-consent";

// Ouvre l'écran de consentement Microsoft pour le manager lui-même — le cas
// d'une PME où le manager EST l'administrateur du tenant. Dans les autres
// cas, il envoie le lien à son informatique depuis Paramètres › Connexions
// (le lien affiché là est construit par la même fonction, côté page).
//
// Réservé aux managers : l'accord engage toute l'organisation.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  if (auth.role !== "manager" || !auth.organizationId) {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!clientId || !secret) {
    return NextResponse.json({ error: "AZURE_AD_CLIENT_ID ou NEXTAUTH_SECRET manquant." }, { status: 500 });
  }

  // Le tenant du client, deviné depuis le domaine de l'email du manager :
  // l'administrateur n'a alors pas à choisir son organisation. Un domaine
  // grand public (gmail.com) ou un domaine qui n'est pas sur Microsoft 365
  // rend null, et « organizations » prend le relais.
  const domain = session?.user?.email?.split("@")[1] ?? "";
  const tenant = domain ? await resolveMicrosoftTenant(domain) : null;

  return NextResponse.redirect(
    buildAdminConsentUrl({
      clientId,
      tenant,
      redirectUri: `${APP_URL}/api/microsoft/admin-consent/callback`,
      state: signConsentState({ organizationId: auth.organizationId }, secret),
    })
  );
}
