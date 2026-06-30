import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCallReplyInfo } from "@/lib/db";
import { checkThreadReply } from "@/lib/gmail";
import { generateReplyToProspect } from "@/lib/email-followup";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let callId: string;
  try {
    ({ callId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!callId || typeof callId !== "string") {
    return NextResponse.json({ error: "callId requis." }, { status: 400 });
  }

  const info = await getCallReplyInfo(callId, userId);
  if (!info) {
    return NextResponse.json({ error: "Call introuvable." }, { status: 403 });
  }

  if (!info.follow_up_email) {
    return NextResponse.json({ error: "Aucun email de suivi pour ce call." }, { status: 400 });
  }

  if (!info.replied_at) {
    return NextResponse.json({ error: "Aucune réponse du prospect détectée." }, { status: 400 });
  }

  // Fetch prospect reply body from Gmail (force=true to get the actual content)
  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Token d'accès Google manquant. Reconnectez-vous." }, { status: 401 });
  }

  if (!info.gmail_thread_id) {
    return NextResponse.json({ error: "Thread Gmail introuvable." }, { status: 400 });
  }

  let prospectReplyBody: string;
  try {
    const result = await checkThreadReply(
      accessToken,
      info.gmail_thread_id,
      info.contact_email ?? "",
      info.follow_up_sent_at ?? new Date(0).toISOString()
    );
    if (!result.replied) {
      return NextResponse.json({ error: "Aucune réponse trouvée dans le thread." }, { status: 400 });
    }
    prospectReplyBody = result.body;
  } catch (err) {
    console.error("[generate-reply-suggestion] checkThreadReply failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Impossible de récupérer la réponse du prospect." }, { status: 500 });
  }

  const suggestion = await generateReplyToProspect(prospectReplyBody, info.follow_up_email);

  if (!suggestion) {
    return NextResponse.json({ error: "Erreur lors de la génération de la suggestion." }, { status: 500 });
  }

  return NextResponse.json({ suggestion });
}
