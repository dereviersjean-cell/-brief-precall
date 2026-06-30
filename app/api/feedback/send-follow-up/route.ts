import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCallWithAnalysis, updateCallFollowUp, updateFollowUpSentAt, updateGmailThreadId } from "@/lib/db";

function encodeMimeSubject(subject: string): string {
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  }
  return subject;
}

function buildRfc2822(to: string, subject: string, body: string): string {
  const normalizedBody = body.replace(/(?<!\n)\n(?!\n)/g, " ");
  return [
    `To: ${to}`,
    `Subject: ${encodeMimeSubject(subject)}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    normalizedBody,
  ].join("\r\n");
}

function toBase64Url(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let callId: string;
  let editedSubject: string | undefined;
  let editedBody: string | undefined;
  try {
    ({ callId, subject: editedSubject, body: editedBody } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!callId || typeof callId !== "string") {
    return NextResponse.json({ error: "callId requis." }, { status: 400 });
  }

  // Fetch call and verify ownership
  let call;
  try {
    call = await getCallWithAnalysis(callId, userId);
  } catch (err) {
    console.error("[send-follow-up] getCallWithAnalysis failed:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du call." }, { status: 500 });
  }

  if (!call) {
    return NextResponse.json({ error: "Call introuvable." }, { status: 403 });
  }

  const finalSubject = editedSubject?.trim() || call.follow_up_email?.subject;
  const finalBody = editedBody?.trim() || call.follow_up_email?.body;

  if (!finalSubject || !finalBody) {
    return NextResponse.json({ error: "Aucun email de suivi généré pour ce call." }, { status: 400 });
  }

  if (!call.contact_email) {
    return NextResponse.json({ error: "Adresse email du contact introuvable." }, { status: 400 });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Token d'accès Google manquant. Reconnectez-vous." }, { status: 401 });
  }

  // Persist edited content before sending so history reflects what was actually sent
  if (
    (editedSubject !== undefined || editedBody !== undefined) &&
    (finalSubject !== call.follow_up_email?.subject || finalBody !== call.follow_up_email?.body)
  ) {
    try {
      await updateCallFollowUp(callId, { subject: finalSubject, body: finalBody });
    } catch (err) {
      console.error("[send-follow-up] updateCallFollowUp failed:", err);
    }
  }

  // Build and send email via Gmail API
  const raw = toBase64Url(
    buildRfc2822(call.contact_email, finalSubject, finalBody)
  );

  let gmailRes: Response;
  try {
    gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
  } catch (err) {
    console.error("[send-follow-up] Gmail API fetch failed:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 });
  }

  if (gmailRes.status === 401 || gmailRes.status === 403) {
    console.error("[send-follow-up] Gmail auth error:", gmailRes.status);
    return NextResponse.json(
      { error: "Session Google expirée. Reconnectez-vous pour envoyer l'email." },
      { status: 401 }
    );
  }

  if (!gmailRes.ok) {
    const detail = await gmailRes.text();
    console.error("[send-follow-up] Gmail API error:", gmailRes.status, detail);
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 });
  }

  // Parse threadId from Gmail response
  let threadId: string | null = null;
  try {
    const gmailData = await gmailRes.json() as { threadId?: string };
    threadId = gmailData.threadId ?? null;
  } catch {
    // non-blocking
  }

  // Mark as sent
  try {
    await updateFollowUpSentAt(callId);
  } catch (err) {
    console.error("[send-follow-up] updateFollowUpSentAt failed:", err);
    // Non-blocking — email was sent, just the timestamp update failed
  }

  if (threadId) {
    try {
      await updateGmailThreadId(callId, threadId);
    } catch (err) {
      console.error("[send-follow-up] updateGmailThreadId failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
