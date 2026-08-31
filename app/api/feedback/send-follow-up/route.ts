import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getCallWithAnalysis, updateCallContactEmail, updateCallFollowUp, updateFollowUpSentAt, updateGmailThreadId } from "@/lib/db";
import { isValidEmail } from "@/lib/email-address";

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
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  let callId: string;
  let editedSubject: string | undefined;
  let editedBody: string | undefined;
  let providedEmail: string | undefined;
  try {
    ({
      callId,
      subject: editedSubject,
      body: editedBody,
      contactEmail: providedEmail,
    } = await request.json());
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

  // Destinataire : l'adresse saisie prime sur celle du call — c'est
  // précisément le cas où le call n'en a pas (invitation d'agenda sans
  // participant externe), et c'est aussi la seule façon de corriger une
  // adresse fausse sans repasser par le CRM.
  const typedEmail = providedEmail?.trim();
  if (typedEmail && !isValidEmail(typedEmail)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }
  const recipient = typedEmail || call.contact_email;

  if (!recipient) {
    return NextResponse.json(
      { error: "Aucun destinataire : indiquez l'adresse à laquelle envoyer cet email." },
      { status: 400 }
    );
  }

  const accessToken = session?.accessToken;
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
    buildRfc2822(recipient, finalSubject, finalBody)
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

  // L'adresse saisie est enregistrée sur le call APRÈS un envoi réussi : elle
  // devient le contact de ce rendez-vous pour la suite (historique, relances).
  // Jamais avant l'envoi — une adresse refusée par Gmail ne doit pas rester
  // collée au call. Et jamais par-dessus une adresse déjà connue.
  if (typedEmail && !call.contact_email) {
    try {
      await updateCallContactEmail(callId, typedEmail);
    } catch (err) {
      console.error("[send-follow-up] updateCallContactEmail failed:", err);
      // Non bloquant — l'email est parti, seul l'enregistrement a échoué.
    }
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
