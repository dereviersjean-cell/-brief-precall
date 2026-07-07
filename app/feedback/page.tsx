import { getCallsWithAnalysis } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import FeedbackClient from "./FeedbackClient";

export default async function FeedbackPage() {
  const userId = await getEffectiveUserId();

  const calls = userId ? await getCallsWithAnalysis(userId) : [];

  return <FeedbackClient calls={calls} />;
}
