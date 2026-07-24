import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import { getUserOrganizationId, listTrainingObjectionCandidatesForUser, listTrainingSessionsForUser } from "@/lib/db";
import TrainingClient from "./TrainingClient";

export const dynamic = "force-dynamic";

export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ objection?: string }> }) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const { objection } = await searchParams;
  const organizationId = await getUserOrganizationId(userId);

  // Pattern bug #14 : la table training_sessions (migration 002) peut ne pas
  // encore exister en prod — la page doit se rendre quand même (listes vides)
  // plutôt que de tomber entière via Promise.all.
  const [candidates, history] = await Promise.all([
    organizationId
      ? listTrainingObjectionCandidatesForUser(userId, organizationId).catch(() => [])
      : Promise.resolve([]),
    listTrainingSessionsForUser(userId).catch(() => []),
  ]);

  return <TrainingClient candidates={candidates} history={history} initialObjection={objection?.slice(0, 500) ?? null} />;
}
