import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCallReplyInfo } from "@/lib/db";
import { checkThreadReply } from "@/lib/gmail";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const callId = request.nextUrl.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json({ error: "callId requis." }, { status: 400 });
  }

  const info = await getCallReplyInfo(callId, userId);
  if (!info) {
    return NextResponse.json({ error: "Call introuvable." }, { status: 403 });
  }

  if (!info.gmail_thread_id) {
    return NextResponse.json({ replied: false });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Token d'accès Google manquant. Reconnectez-vous." }, { status: 401 });
  }

  try {
    const result = await checkThreadReply(
      accessToken,
      info.gmail_thread_id,
      info.contact_email ?? "",
      info.follow_up_sent_at ?? new Date(0).toISOString()
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[check-reply] checkThreadReply failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Erreur lors de la vérification du thread." }, { status: 500 });
  }
}
