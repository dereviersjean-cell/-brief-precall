import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getCallReplyInfo, getEffectiveEmailTemplateSystemPrompt } from "@/lib/db";
import { checkThreadReply } from "@/lib/gmail";
import { generateReplyToProspect, generateReplyToProspectWithTemplate } from "@/lib/email-followup";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  let callId: string;
  let emailTemplateId: string | undefined;
  try {
    ({ callId, email_template_id: emailTemplateId } = await request.json());
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
  const accessToken = session?.accessToken;
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

  // Optional template override (sous-étape B of Email Templates). Only ever
  // trusts a template after getEffectiveEmailTemplateSystemPrompt
  // re-verifies it belongs to this user's org — an id for another org's
  // template resolves to null and 404s here rather than silently falling
  // back or leaking its prompt. Prefers the caller's personal override over
  // the template's own prompt when one exists (sous-étape C).
  let suggestion: string | null;
  if (emailTemplateId) {
    const effectivePrompt = await getEffectiveEmailTemplateSystemPrompt(userId, emailTemplateId);
    if (effectivePrompt === null) {
      return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
    }
    suggestion = await generateReplyToProspectWithTemplate(prospectReplyBody, info.follow_up_email, effectivePrompt);
  } else {
    suggestion = await generateReplyToProspect(prospectReplyBody, info.follow_up_email);
  }

  if (!suggestion) {
    return NextResponse.json({ error: "Erreur lors de la génération de la suggestion." }, { status: 500 });
  }

  return NextResponse.json({ suggestion });
}
