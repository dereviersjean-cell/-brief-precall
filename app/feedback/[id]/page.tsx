import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCallWithAnalysis, getCallWithAnalysisForManager, getUserRole } from "@/lib/db";
import { notFound } from "next/navigation";
import FeedbackDetailClient from "./FeedbackDetailClient";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

  if (!userId) notFound();

  // Owner first — covers the common case without an extra role lookup.
  let call = await getCallWithAnalysis(id, userId);

  if (!call) {
    const role = await getUserRole(userId);
    if (role === "manager") {
      call = await getCallWithAnalysisForManager(id, userId);
    }
  }

  if (!call) notFound();

  return <FeedbackDetailClient call={call} />;
}
