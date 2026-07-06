import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getLatestImportJob, getClientReferencesCount } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  let job, refCount;
  try {
    [job, refCount] = await Promise.all([
      getLatestImportJob(userId),
      getClientReferencesCount(userId),
    ]);
  } catch (err) {
    console.error("[import-status] Promise.all failed:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du statut." }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ status: null, ref_count: refCount });
  }

  return NextResponse.json({
    status: job.status,
    total: job.total,
    processed: job.processed,
    chunks_total: job.chunks_total,
    chunks_done: job.chunks_done,
    ref_count: refCount,
  });
}
