import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRole, getCallWithAnalysisForManager } from "@/lib/db";
import CallDetailClient from "./CallDetailClient";

export default async function TeamMemberCallDetailPage({
  params,
}: {
  params: Promise<{ commercialId: string; callId: string }>;
}) {
  const { commercialId, callId } = await params;
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

  const role = userId ? await getUserRole(userId) : null;
  if (role !== "manager") {
    redirect("/dashboard");
  }

  const call = await getCallWithAnalysisForManager(callId, userId!);
  if (!call) {
    redirect(`/team/${commercialId}`);
  }

  return <CallDetailClient call={call} commercialId={commercialId} />;
}
