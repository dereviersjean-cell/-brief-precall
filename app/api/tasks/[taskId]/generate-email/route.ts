import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { checkAiGenerationRateLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { readPromptConfig, DEFAULT_TASK_EMAIL_PROMPT } from "@/lib/admin-config";
import {
  getTaskById,
  getContactById,
  getContact,
  getCallWithAnalysis,
  getQuoteWithLines,
  getUserName,
  getUserProfile,
  getEffectiveEmailTemplateSystemPrompt,
  type TaskListItem,
} from "@/lib/db";
import { formatContactDisplayName } from "@/lib/format";
import { extractJsonObject } from "@/lib/ai-json";
import { validateAiShape } from "@/lib/ai-shape";

export type GeneratedTaskEmail = { subject: string; body: string };

// Appended to whichever prompt is used (default or an org's custom Email
// Template) — never left to the prompt author to restate. A manager editing
// a template on /team/email-templates writes content instructions only (e.g.
// "structure the email with these 8 sections"); nothing there told them the
// route parses the response as strict {subject, body} JSON, so a
// content-only template made Claude correctly follow it and return prose,
// breaking JSON.parse downstream. The 300-word cap keeps arbitrarily long
// custom templates (e.g. one asking for 8 bulleted sections) inside the
// max_tokens budget instead of truncating mid-JSON.
const JSON_OUTPUT_CONTRACT = `

---
Quelles que soient les instructions ci-dessus sur le contenu à rédiger, le format de sortie est non négociable : tu dois retourner UNIQUEMENT un objet JSON strict, sans texte avant ni après, sans balises de code markdown :
{
  "subject": "...",
  "body": "..."
}
Le "body" est le texte complet de l'email (texte brut, éventuellement avec des puces "-"), respectant les consignes de contenu ci-dessus. N'inclus aucun contenu hors de ces deux champs JSON.
Reste concis : 300 mots maximum pour le "body", quel que soit le nombre de sections ou de points demandés ci-dessus — condense plutôt que de tout développer.`;

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
      if (call.analysis?.objections?.length) {
        parts.push(
          `Objections : ${call.analysis.objections.map((o) => `${o.objection} (réponse apportée : ${o.response})`).join("; ")}`
        );
      }
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

  const rl = checkAiGenerationRateLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`, retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

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
  // trusts a template after getEffectiveEmailTemplateSystemPrompt re-verifies
  // it belongs to this user's org — an id for another org's template
  // resolves to null and 404s here rather than silently falling back or
  // leaking its prompt. Prefers the caller's personal override over the
  // template's own prompt when one exists (sous-étape C).
  let basePrompt: string;
  if (emailTemplateId) {
    const effectivePrompt = await getEffectiveEmailTemplateSystemPrompt(auth.userId, emailTemplateId);
    if (effectivePrompt === null) {
      return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
    }
    basePrompt = effectivePrompt;
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
  let stopReason: string | null = null;
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: basePrompt + JSON_OUTPUT_CONTRACT,
      messages: [{ role: "user", content: contextPrompt }],
    });

    stopReason = message.stop_reason;
    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock?.type === "text" ? textBlock.text : "";
    // Valider AVANT de nettoyer : sanitizeEmail remplace un corps manquant
    // par une chaîne vide, ce qui donnait un email blanc sans la moindre
    // alerte. On veut une erreur visible, pas un contenu vide.
    const parsed = validateAiShape<unknown>("tasks.generateEmail", "task_email_prompt", JSON.parse(extractJsonObject(raw)), {
      subject: "nonEmptyString",
      body: "nonEmptyString",
    });

    return NextResponse.json(sanitizeEmail(parsed, task));
  } catch (err) {
    // Logs enough to diagnose a failure from Vercel logs alone, without a
    // redeploy: which task/template triggered it, the raw Claude response
    // (not just the parse error — "Unexpected token" alone can't distinguish
    // prose-wrapped JSON from mid-object truncation), and stop_reason (a
    // "max_tokens" cutoff needs a bigger budget or a tighter prompt; anything
    // else means the model just didn't produce valid JSON).
    console.error(
      "[tasks/generate-email] generation failed:",
      err instanceof Error ? err.message : err,
      `\ntaskId=${taskId} userId=${auth.userId} emailTemplateId=${emailTemplateId ?? "(default prompt)"} stop_reason=${stopReason ?? "(API call itself failed)"}`,
      raw ? `\nRaw Claude response:\n${raw}` : "(no response captured — API call itself failed)"
    );
    return NextResponse.json(
      { error: "La génération a échoué. Réessayez ou rédigez l'email manuellement." },
      { status: 502 }
    );
  }
}
