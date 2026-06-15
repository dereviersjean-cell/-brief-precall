import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLatestImportJob, getClientReferencesCount } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const [job, refCount] = await Promise.all([
    getLatestImportJob(userId),
    getClientReferencesCount(userId),
  ]);

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
