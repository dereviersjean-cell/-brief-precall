import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCallsWithAnalysis } from "@/lib/db";
import FeedbackClient from "./FeedbackClient";

export default async function FeedbackPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

  const calls = userId ? await getCallsWithAnalysis(userId) : [];

  return <FeedbackClient calls={calls} />;
}
