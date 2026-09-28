import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getTaskById, completeTask, getGoogleTokens, markCallFollowUpSentIfUnset } from "@/lib/db";
import { refreshGoogleAccessToken } from "@/lib/gmail";
import { outlookSendFailure, sendOutlookMail } from "@/lib/microsoft";

function encodeMimeSubject(subject: string): string {
  if (/[^\x00-\x7F]/.test(subject)) {
    return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  }
  return subject;
}

function normalizeBody(body: string): string {
  return body.replace(/(?<!\n)\n(?!\n)/g, " ");
}

function buildRfc2822(to: string, subject: string, body: string): string {
  const normalizedBody = normalizeBody(body);
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { taskId } = await params;
  const task = await getTaskById(taskId, auth.userId);
  if (!task) {
    return NextResponse.json({ error: "Task introuvable." }, { status: 404 });
  }
  if (!task.contact_email) {
    return NextResponse.json({ error: "Email du contact manquant." }, { status: 400 });
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

  if (session?.provider === "azure-ad") {
    // Compte Microsoft : envoi via Outlook, avec le jeton de la session
    // (renouvelé par lib/auth.ts). Brief ne conserve pas de jeton Microsoft
    // en base : sous impersonation admin, la session n'est pas celle de
    // l'utilisateur et on retombe sur la branche Google ci-dessous.
    const sent = await sendOutlookMail(session.accessToken ?? "", {
      to: task.contact_email,
      subject,
      body: normalizeBody(bodyText),
    });
    if (!sent.ok) {
      console.error("[tasks/send-email] Outlook send failed:", sent.status, sent.detail);
      const failure = outlookSendFailure(sent);
      return NextResponse.json({ error: failure.error }, { status: failure.status });
    }
  } else {
    // Refresh-token based (not session.accessToken) — consistent with the
    // quotes module, so this also works when an admin is impersonating the user.
    const { refreshToken } = await getGoogleTokens(auth.userId);
    if (!refreshToken) {
      return NextResponse.json(
        { error: "Gmail non connecté. Connectez votre compte Google dans les paramètres pour envoyer cet email." },
        { status: 400 }
      );
    }

    let accessToken: string;
    try {
      accessToken = await refreshGoogleAccessToken(refreshToken);
    } catch (err) {
      console.error("[tasks/send-email] Google token refresh failed:", err);
      return NextResponse.json(
        { error: "Session Google expirée. Reconnectez votre compte Google dans les paramètres." },
        { status: 400 }
      );
    }

    const raw = toBase64Url(buildRfc2822(task.contact_email, subject, bodyText));

    let gmailRes: Response;
    try {
      gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
    } catch (err) {
      console.error("[tasks/send-email] Gmail API fetch failed:", err);
      return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 });
    }

    if (!gmailRes.ok) {
      const detail = await gmailRes.text();
      console.error("[tasks/send-email] Gmail API error:", gmailRes.status, detail);
      return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 });
    }
  }

  try {
    await completeTask(taskId, auth.userId);
  } catch (err) {
    console.error("[tasks/send-email] completeTask failed:", err);
  }

  if (task.source_type === "call" && task.source_id) {
    try {
      await markCallFollowUpSentIfUnset(task.source_id);
    } catch (err) {
      console.error("[tasks/send-email] markCallFollowUpSentIfUnset failed (non-blocking):", err);
    }
  }

  return NextResponse.json({ ok: true });
}
