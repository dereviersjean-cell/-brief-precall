import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { readPromptConfig, DEFAULT_TASK_EMAIL_PROMPT } from "@/lib/admin-config";
import {
  getTaskById,
  getContactById,
  getContact,
  getCallWithAnalysis,
  getQuoteWithLines,
  getUserName,
  getUserProfile,
  getEmailTemplateById,
  type TaskListItem,
} from "@/lib/db";
import { formatContactDisplayName } from "@/lib/format";

export type GeneratedTaskEmail = { subject: string; body: string };

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

async function buildSourceContext(task: TaskListItem, userId: string): Promise<string> {
  if (!task.source_id) return "Aucun contexte source disponible.";

  if (task.source_type === "call" || task.source_type === "email") {
    const call = await getCallWithAnalysis(task.source_id, userId);
    if (!call) return "Aucun contexte source disponible.";

    const parts: string[] = [];
    if (task.source_type === "call") {
      parts.push(`Call du ${new Date(call.started_at ?? call.created_at).toLocaleDateString("fr-FR")}`);
      if (call.analysis?.summary) parts.push(`Résumé : ${call.analysis.summary}`);
      if (call.analysis?.strengths?.length) parts.push(`Points forts : ${call.analysis.strengths.join("; ")}`);
      if (call.analysis?.objections?.length) parts.push(`Objections : ${call.analysis.objections.join("; ")}`);
      if (call.analysis?.next_steps?.length) {
        parts.push(`Prochaines étapes convenues : ${call.analysis.next_steps.join("; ")}`);
      }
    } else {
      parts.push("Email de suivi précédemment envoyé pour ce call, resté sans réponse :");
      if (call.follow_up_email) {
        parts.push(`Sujet envoyé : ${call.follow_up_email.subject}`);
        parts.push(`Corps envoyé : ${call.follow_up_email.body}`);
      }
      parts.push(
        `Envoyé le : ${call.follow_up_sent_at ? new Date(call.follow_up_sent_at).toLocaleDateString("fr-FR") : "date inconnue"}`
      );
      if (call.analysis?.summary) parts.push(`Contexte du call initial : ${call.analysis.summary}`);
    }
    return parts.join("\n");
  }

  if (task.source_type === "quote") {
    const quote = await getQuoteWithLines(task.source_id, userId);
    if (!quote) return "Aucun contexte source disponible.";

    const linesText = quote.lines
      .map((l) => `- ${l.name} (qté ${l.quantity} ${l.unit}, ${formatCurrency(l.unit_price)}/u)`)
      .join("\n");
    return `Devis ${quote.quote_number}, envoyé le ${
      quote.sent_at ? new Date(quote.sent_at).toLocaleDateString("fr-FR") : "date inconnue"
    }, resté sans acceptation à ce jour.
Lignes :
${linesText}
Montant total TTC : ${formatCurrency(quote.total_ttc)}`;
  }

  return "Aucun contexte source disponible.";
}

// More resilient than the previous "strip ```json fences and hope the whole
// string is valid JSON" — a template asking for extra framing (or Claude
// adding so much as a one-line preamble/postamble around the fence) used to
// break JSON.parse outright. This isolates the {...} object regardless of
// what surrounds it, while staying a no-op for the common pure-JSON case.
function extractJsonObject(raw: string): string {
  const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return cleaned;
  return cleaned.slice(start, end + 1);
}

function sanitizeEmail(raw: unknown, task: TaskListItem): GeneratedTaskEmail {
  const obj = (raw ?? {}) as Partial<GeneratedTaskEmail>;
  return {
    subject: typeof obj.subject === "string" && obj.subject.trim() ? obj.subject.trim() : task.title,
    body: typeof obj.body === "string" && obj.body.trim() ? obj.body.trim() : "",
  };
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

  // Body is optional (rétrocompat) — the existing client calls this with no
  // body at all for the default-prompt path.
  let emailTemplateId: string | undefined;
  try {
    const body = (await request.json()) as { email_template_id?: string };
    emailTemplateId = body?.email_template_id;
  } catch {
    // no body / invalid JSON — fine, treated the same as "no template selected"
  }

  const contact = task.contact_id
    ? await getContactById(task.contact_id, auth.userId)
    : task.contact_email
    ? await getContact(auth.userId, task.contact_email)
    : null;

  const contactEmail = contact?.email ?? task.contact_email;
  const contactName =
    task.contact_name ?? (contact ? formatContactDisplayName(contact.company_name, contact.email) : null);

  const [commercialName, profile, sourceContext] = await Promise.all([
    getUserName(auth.userId),
    getUserProfile(auth.userId),
    buildSourceContext(task, auth.userId),
  ]);

  // Optional template override (sous-étape B of Email Templates). Only ever
  // trusts a template after getEmailTemplateById re-verifies it belongs to
  // this user's org — an id for another org's template resolves to null and
  // 404s here rather than silently falling back or leaking its prompt.
  let basePrompt: string;
  if (emailTemplateId) {
    const template = await getEmailTemplateById(emailTemplateId, auth.userId);
    if (!template) {
      return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
    }
    basePrompt = template.system_prompt;
  } else {
    basePrompt = (await readPromptConfig("task_email_prompt")) ?? DEFAULT_TASK_EMAIL_PROMPT;
  }

  const contextPrompt = `TYPE DE TASK

${task.task_type} — ${task.title}
${task.description ? `Description : ${task.description}` : ""}

INFOS DU COMMERCIAL

Nom : ${commercialName ?? "Non renseigné"}
${profile?.company_name ? `Entreprise : ${profile.company_name}` : ""}

INFOS DU PROSPECT

Nom / société : ${contactName ?? "Non renseigné"}
Email : ${contactEmail ?? "Non renseigné"}

CONTEXTE SOURCE

${sourceContext}`;

  let raw = "";
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      // Was 800 — too tight for some templates (e.g. Call 1 explicitly asks
      // for 5-7 sentences covering 4 separate points), risking truncation
      // mid-JSON on longer real-world call context. Matches the budget
      // generateFollowUpEmail already uses for the same subject+body JSON shape.
      max_tokens: 1500,
      system: basePrompt,
      messages: [{ role: "user", content: contextPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock?.type === "text" ? textBlock.text : "";
    const parsed = JSON.parse(extractJsonObject(raw)) as unknown;

    return NextResponse.json(sanitizeEmail(parsed, task));
  } catch (err) {
    // Logs the raw Claude response, not just the parse error — without this,
    // a JSON.parse failure showed up in Vercel logs as a bare "Unexpected
    // token" with no way to tell whether Claude wrapped the JSON in prose,
    // truncated mid-object, or something else entirely.
    console.error(
      "[tasks/generate-email] generation failed:",
      err instanceof Error ? err.message : err,
      raw ? `\nRaw Claude response:\n${raw}` : "(no response captured — API call itself failed)"
    );
    return NextResponse.json(
      { error: "La génération a échoué. Réessayez ou rédigez l'email manuellement." },
      { status: 502 }
    );
  }
}
