import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLatestImportJob } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const job = await getLatestImportJob(userId);
  if (!job) {
    return NextResponse.json({ status: null });
  }

  return NextResponse.json({
    status: job.status,
    total: job.total,
    processed: job.processed,
  });
}
