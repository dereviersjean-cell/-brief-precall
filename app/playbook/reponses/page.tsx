import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import {
  getUserOrganizationId,
  getUserRole,
  listObjectionsForOrganization,
  getObjectionCoverageForOrganization,
} from "@/lib/db";
import ObjectionsClient from "./ObjectionsClient";
import { PageHeader } from "@/app/components/ui/PageHeader";
import type { ReactNode } from "react";

// Réponses aux objections (ex-Paramètres › Objections, page propre depuis le
// 15/10/2026) : la bibliothèque des objections de l'équipe et leurs réponses.
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        eyebrow="Playbook & objections"
        title="Réponses aux objections"
        subtitle="Les objections rencontrées par l'équipe et les réponses qui ont fonctionné, à retrouver en un instant."
      />
      <div className="mt-8">{children}</div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function ObjectionAnswersPage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [organizationId, role] = await Promise.all([getUserOrganizationId(userId), getUserRole(userId)]);

  if (!organizationId) {
    return (
      <Frame>
      <p className="rounded-2xl border border-border bg-white p-6 text-[13.5px] text-slate-500">
        Votre compte n&apos;est rattaché à aucune organisation — la bibliothèque d&apos;objections est partagée au
        niveau de l&apos;équipe. Contactez votre administrateur.
      </p>
      </Frame>
    );
  }

  const [objections, coverage] = await Promise.all([
    listObjectionsForOrganization(organizationId),
    getObjectionCoverageForOrganization(organizationId),
  ]);

  return (
    <Frame>
    <ObjectionsClient
      objections={objections}
      coverage={coverage}
      currentUserId={userId}
      isManager={role === "manager"}
    />
    </Frame>
  );
}
