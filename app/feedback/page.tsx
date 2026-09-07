import { getCallsWithAnalysis, getUserName } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import FeedbackClient from "./FeedbackClient";

export default async function FeedbackPage() {
  const userId = await getEffectiveUserId();

  // Le nom du commercial sert à le RETIRER de la liste des participants d'un
  // call : ce qu'on veut afficher, c'est la personne d'en face.
  const [calls, commercialName] = userId
    ? await Promise.all([getCallsWithAnalysis(userId), getUserName(userId)])
    : [[], null];

  return <FeedbackClient calls={calls} commercialName={commercialName} />;
}
