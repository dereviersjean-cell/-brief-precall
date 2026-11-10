import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { requireActiveUserContext } from "./api-auth";
import { getHubspotUserForOrganization, isDealMemoryEnabledForOrganization } from "./db";

// Garde commune aux routes /api/hubspot-autofill : manager d'une organisation
// où la fiche deal est active. Tout le reste reçoit un 404.
export async function autofillGuard() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return { response: auth.response } as const;
  if (auth.role !== "manager" || !auth.organizationId || !(await isDealMemoryEnabledForOrganization(auth.organizationId))) {
    return { response: NextResponse.json({ error: "Indisponible." }, { status: 404 }) } as const;
  }
  const hubspotUser = await getHubspotUserForOrganization(auth.organizationId, [auth.userId]);
  return { userId: auth.userId, organizationId: auth.organizationId, hubspotUser } as const;
}
