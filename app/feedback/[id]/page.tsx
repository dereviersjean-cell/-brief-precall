import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCallWithAnalysis } from "@/lib/db";
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

  const call = await getCallWithAnalysis(id, userId);
  if (!call) notFound();

  return <FeedbackDetailClient call={call} />;
}
