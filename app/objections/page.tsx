import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import {
  getUserOrganizationId,
  getUserRole,
  listObjectionsForOrganization,
  getObjectionCoverageForOrganization,
} from "@/lib/db";
import ObjectionsClient from "./ObjectionsClient";

export const dynamic = "force-dynamic";

export default async function ObjectionsPage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [organizationId, role] = await Promise.all([getUserOrganizationId(userId), getUserRole(userId)]);

  if (!organizationId) {
    return (
      <main className="brief-ui px-4 sm:px-10 py-8 max-w-4xl">
        <p className="text-sm text-slate-500">
          Votre compte n&apos;est rattaché à aucune organisation — la bibliothèque d&apos;objections est partagée au
          niveau de l&apos;équipe. Contactez votre administrateur.
        </p>
      </main>
    );
  }

  const [objections, coverage] = await Promise.all([
    listObjectionsForOrganization(organizationId),
    getObjectionCoverageForOrganization(organizationId),
  ]);

  return (
    <ObjectionsClient
      objections={objections}
      coverage={coverage}
      currentUserId={userId}
      isManager={role === "manager"}
    />
  );
}
