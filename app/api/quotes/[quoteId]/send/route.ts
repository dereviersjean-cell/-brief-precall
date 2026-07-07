import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getQuoteWithLines, markQuoteAsSent, getGoogleTokens } from "@/lib/db";
import { refreshGoogleAccessToken } from "@/lib/gmail";
import { renderQuoteToPdfBuffer } from "@/lib/pdf/QuoteDocument";

// Same hardcoded-origin convention as lib/email.ts / lib/recall.ts.
const APP_URL = "https://brief-precall.vercel.app";

function encodeMimeSubject(subject: string): string {
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  }
  return subject;
}

function wrapBase64(b64: string): string {
  return b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
}

function buildRfc2822WithAttachment(params: {
  to: string;
  subject: string;
  body: string;
  attachmentFilename: string;
  attachmentBuffer: Buffer;
}): string {
  const boundary = `brief_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const normalizedBody = params.body.replace(/(?<!\n)\n(?!\n)/g, " ");
  const attachmentBase64 = wrapBase64(params.attachmentBuffer.toString("base64"));

  return [
    "MIME-Version: 1.0",
    `To: ${params.to}`,
    `Subject: ${encodeMimeSubject(params.subject)}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    normalizedBody,
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name="${params.attachmentFilename}"`,
    `Content-Disposition: attachment; filename="${params.attachmentFilename}"`,
    "Content-Transfer-Encoding: base64",
    "",
    attachmentBase64,
    "",
    `--${boundary}--`,
  ].join("\r\n");
}

function toBase64Url(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { quoteId } = await params;
  const quote = await getQuoteWithLines(quoteId, auth.userId);
  if (!quote) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }
  if (quote.status !== "draft") {
    return NextResponse.json({ error: "Seuls les devis en brouillon peuvent être envoyés." }, { status: 400 });
  }
  if (!quote.client_email) {
    return NextResponse.json({ error: "Email du client manquant." }, { status: 400 });
  }

  let requestBody: { subject?: unknown; body?: unknown };
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const subject = typeof requestBody.subject === "string" ? requestBody.subject.trim() : "";
  const bodyText = typeof requestBody.body === "string" ? requestBody.body.trim() : "";
  if (!subject) {
    return NextResponse.json({ error: "Le sujet de l'email est requis." }, { status: 400 });
  }
  if (!bodyText) {
    return NextResponse.json({ error: "Le corps de l'email est requis." }, { status: 400 });
  }

  // Refresh-token based (not session.accessToken) — this must also work when
  // an admin is impersonating the user (no real Google OAuth session then),
  // consistent with the rest of the quotes module.
  const { refreshToken } = await getGoogleTokens(auth.userId);
  if (!refreshToken) {
    return NextResponse.json(
      { error: "Connectez votre compte Google (Gmail) dans les paramètres avant d'envoyer un devis." },
      { status: 400 }
    );
  }

  const publicToken = randomUUID();
  const publicUrl = `${APP_URL}/q/${publicToken}`;

  // The signature link is appended server-side, after whatever the user
  // wrote/edited — it must always be present and can't be accidentally
  // stripped out of the editable body.
  const finalBody = `${bodyText}\n\nConsultez et signez votre devis en ligne : ${publicUrl}`;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderQuoteToPdfBuffer(quote, quote.lines);
  } catch (err) {
    console.error("[quotes/send] PDF render failed:", err);
    return NextResponse.json({ error: "Erreur lors de la génération du PDF." }, { status: 500 });
  }

  let accessToken: string;
  try {
    accessToken = await refreshGoogleAccessToken(refreshToken);
  } catch (err) {
    console.error("[quotes/send] Google token refresh failed:", err);
    return NextResponse.json(
      { error: "Session Google expirée. Reconnectez votre compte Google dans les paramètres." },
      { status: 400 }
    );
  }

  const raw = toBase64Url(
    buildRfc2822WithAttachment({
      to: quote.client_email,
      subject,
      body: finalBody,
      attachmentFilename: `${quote.quote_number}.pdf`,
      attachmentBuffer: pdfBuffer,
    })
  );

  let gmailRes: Response;
  try {
    gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
  } catch (err) {
    console.error("[quotes/send] Gmail API fetch failed:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 });
  }

  if (!gmailRes.ok) {
    const detail = await gmailRes.text();
    console.error("[quotes/send] Gmail API error:", gmailRes.status, detail);
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 });
  }

  try {
    await markQuoteAsSent(quoteId, auth.userId, publicToken, subject, finalBody);
  } catch (err) {
    console.error("[quotes/send] markQuoteAsSent failed:", err);
    return NextResponse.json(
      { error: "L'email a été envoyé mais la mise à jour du statut a échoué." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
