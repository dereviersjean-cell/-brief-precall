import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createImportJob } from "@/lib/db";
import { inngest } from "@/lib/inngest";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: { file?: string; fileType?: string; text?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { file, fileType, text, source } = body;

  if (!file && !text) {
    return NextResponse.json({ error: "Fichier ou texte requis." }, { status: 400 });
  }

  const actualSource = source ?? (file ? "upload" : "manual");

  let jobId: string;
  try {
    jobId = await createImportJob(userId, 0);
  } catch (err) {
    console.error("[references] createImportJob failed:", err);
    return NextResponse.json({ error: "Erreur lors de la création du job." }, { status: 500 });
  }

  try {
    await inngest.send({
      name: "references/import.requested",
      data: {
        userId,
        jobId,
        source: actualSource,
        ...(file ? { file, fileType } : { text }),
      },
    });
  } catch (err) {
    console.error("[references] inngest.send failed:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi du job." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, jobId });
}
