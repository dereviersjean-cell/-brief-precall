import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCallReplyInfo } from "@/lib/db";

function encodeMimeSubject(subject: string): string {
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  }
  return subject;
}

function toBase64Url(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildReplyRfc2822(
  to: string,
  subject: string,
  body: string,
  inReplyTo: string
): string {
  const reSubject = subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`;
  return [
    `To: ${to}`,
    `Subject: ${encodeMimeSubject(reSubject)}`,
    `In-Reply-To: ${inReplyTo}`,
    `References: ${inReplyTo}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let callId: string;
  let body: string;
  try {
    ({ callId, body } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!callId || typeof callId !== "string" || !body?.trim()) {
    return NextResponse.json({ error: "callId et body requis." }, { status: 400 });
  }

  const info = await getCallReplyInfo(callId, userId);
  if (!info) {
    return NextResponse.json({ error: "Call introuvable." }, { status: 403 });
  }

  if (!info.reply_message_id) {
    return NextResponse.json({ error: "Aucune réponse détectée à laquelle répondre." }, { status: 400 });
  }

  if (!info.gmail_thread_id || !info.contact_email) {
    return NextResponse.json({ error: "Informations du thread manquantes." }, { status: 400 });
  }

  const accessToken = session.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Token d'accès Google manquant. Reconnectez-vous." }, { status: 401 });
  }

  const originalSubject = info.follow_up_email?.subject ?? "";
  const raw = toBase64Url(
    buildReplyRfc2822(info.contact_email, originalSubject, body.trim(), info.reply_message_id)
  );

  let gmailRes: Response;
  try {
    gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw, threadId: info.gmail_thread_id }),
    });
  } catch (err) {
    console.error("[send-reply] Gmail API fetch failed:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 });
  }

  if (gmailRes.status === 401 || gmailRes.status === 403) {
    return NextResponse.json(
      { error: "Session Google expirée. Reconnectez-vous." },
      { status: 401 }
    );
  }

  if (!gmailRes.ok) {
    const detail = await gmailRes.text();
    console.error("[send-reply] Gmail API error:", gmailRes.status, detail);
    return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
