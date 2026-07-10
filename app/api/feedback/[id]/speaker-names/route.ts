import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { updateCallSpeakerNames } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { id: callId } = await params;

  let body: { speaker_names?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const raw = body.speaker_names;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "speaker_names requis." }, { status: 400 });
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.some(([, name]) => typeof name !== "string")) {
    return NextResponse.json({ error: "Chaque nom doit être une chaîne de caractères." }, { status: 400 });
  }
  const speakerNames = Object.fromEntries(
    entries.map(([speakerId, name]) => [speakerId, (name as string).trim()])
  );

  try {
    // updateCallSpeakerNames re-derives ownership (or the manager link to
    // the call's owner) from callId + auth.userId — never trusts the client
    // beyond that, same guard getCallWithAnalysisForManager uses for reads.
    await updateCallSpeakerNames(callId, auth.userId, speakerNames);
    return NextResponse.json({ speaker_names: speakerNames });
  } catch (err) {
    console.error("[feedback/:id/speaker-names] update failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
