import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getCallWithAnalysis, getCallWithAnalysisForManager, getUserRole } from "@/lib/db";
import { getVideoUrl } from "@/lib/recall";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const callId = request.nextUrl.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json({ error: "callId requis." }, { status: 400 });
  }

  let call;
  try {
    // Owner first — covers the common case without an extra role lookup.
    call = await getCallWithAnalysis(callId, userId);
    if (!call) {
      const role = await getUserRole(userId);
      if (role === "manager") {
        call = await getCallWithAnalysisForManager(callId, userId);
      }
    }
  } catch (err) {
    console.error("[video-url] getCallWithAnalysis failed:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du call." }, { status: 500 });
  }

  if (!call) {
    return NextResponse.json({ error: "Call introuvable." }, { status: 403 });
  }

  if (!call.recall_bot_id) {
    return NextResponse.json({ error: "Aucun bot associé à ce call." }, { status: 404 });
  }

  let videoUrl: string | null;
  try {
    videoUrl = await getVideoUrl(call.recall_bot_id);
  } catch (err) {
    console.error("[video-url] getVideoUrl failed:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération de la vidéo." }, { status: 500 });
  }

  if (!videoUrl) {
    return NextResponse.json({ error: "URL vidéo non disponible pour ce call." }, { status: 404 });
  }

  return NextResponse.json({ videoUrl });
}
