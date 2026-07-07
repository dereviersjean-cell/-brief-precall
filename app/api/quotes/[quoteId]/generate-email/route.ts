import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { readPromptConfig, DEFAULT_QUOTE_EMAIL_PROMPT } from "@/lib/admin-config";
import {
  getQuoteWithLines,
  getContactById,
  getContact,
  getCallContextForContact,
  getGoogleTokens,
  getUserName,
  type QuoteWithLines,
  type QuoteGenerationCallContext,
} from "@/lib/db";
import { refreshGoogleAccessToken, getEmailHistory, type GmailMessage } from "@/lib/gmail";

export type GeneratedQuoteEmail = { subject: string; body: string };

function formatCurrency(n: number): string {
  const [intPart, decPart] = Math.abs(n).toFixed(2).split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${n < 0 ? "-" : ""}${withThousands},${decPart} €`;
}

function formatQuoteSummary(quote: QuoteWithLines): string {
  const linesText =
    quote.lines
      .map(
        (l) => `- ${l.name}${l.description ? ` : ${l.description}` : ""} (qté ${l.quantity} ${l.unit}, ${l.unit_price}€/u)`
      )
      .join("\n") || "Aucune ligne.";
  const validity = quote.valid_until
    ? `Valable jusqu'au ${new Date(quote.valid_until).toLocaleDateString("fr-FR")}`
    : "Durée de validité non précisée";

  return `Numéro : ${quote.quote_number}
Lignes :
${linesText}
Montant total TTC : ${formatCurrency(quote.total_ttc)}
${validity}`;
}

function formatEmails(emails: GmailMessage[]): string {
  if (emails.length === 0) return "Aucun échange email trouvé avec ce contact.";
  return emails
    .map(
      (e, i) =>
        `Email ${i + 1}\nDe : ${e.from}\nÀ : ${e.to}\nDate : ${e.date}\nObjet : ${e.subject}\n\n${e.body.slice(0, 500)}${e.body.length > 500 ? "…" : ""}`
    )
    .join("\n\n---\n\n");
}

function formatCalls(calls: QuoteGenerationCallContext[]): string {
  if (calls.length === 0) return "Aucun call analysé trouvé avec ce contact.";
  return calls
    .map((c, i) => {
      const parts = [`Call ${i + 1} (${new Date(c.date).toLocaleDateString("fr-FR")})`];
      if (c.summary) parts.push(`Résumé : ${c.summary}`);
      if (c.objections.length > 0) parts.push(`Objections : ${c.objections.join("; ")}`);
      if (c.next_steps.length > 0) parts.push(`Prochaines étapes convenues : ${c.next_steps.join("; ")}`);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");
}

function sanitizeEmail(raw: unknown, quote: QuoteWithLines): GeneratedQuoteEmail {
  const obj = (raw ?? {}) as Partial<GeneratedQuoteEmail>;
  return {
    subject:
      typeof obj.subject === "string" && obj.subject.trim() ? obj.subject.trim() : `Votre devis ${quote.quote_number}`,
    body: typeof obj.body === "string" && obj.body.trim() ? obj.body.trim() : "",
  };
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

  const contact = quote.contact_id
    ? await getContactById(quote.contact_id, auth.userId)
    : quote.client_email
    ? await getContact(auth.userId, quote.client_email)
    : null;

  const contactEmail = contact?.email ?? quote.client_email;

  const [commercialName, calls] = await Promise.all([
    getUserName(auth.userId),
    contactEmail ? getCallContextForContact(auth.userId, contactEmail) : Promise.resolve([]),
  ]);

  let emails: GmailMessage[] = [];
  if (contactEmail) {
    try {
      const { refreshToken } = await getGoogleTokens(auth.userId);
      if (refreshToken) {
        const accessToken = await refreshGoogleAccessToken(refreshToken);
        emails = await getEmailHistory(accessToken, contactEmail);
      }
    } catch (err) {
      console.log(
        "[quotes/generate-email] email history fetch failed (non-blocking):",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  const basePrompt = (await readPromptConfig("quote_email_prompt")) ?? DEFAULT_QUOTE_EMAIL_PROMPT;

  const contextPrompt = `INFOS DU COMMERCIAL

Nom : ${commercialName ?? "Non renseigné"}

INFOS DU PROSPECT

Nom / société : ${quote.client_name}
Email : ${contactEmail ?? "Non renseigné"}

HISTORIQUE DES CALLS ANALYSÉS

${formatCalls(calls)}

HISTORIQUE DES EMAILS

${formatEmails(emails)}

CONTENU DU DEVIS

${formatQuoteSummary(quote)}`;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: basePrompt,
      messages: [{ role: "user", content: contextPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as unknown;

    return NextResponse.json(sanitizeEmail(parsed, quote));
  } catch (err) {
    console.error("[quotes/generate-email] Claude API failed:", err);
    return NextResponse.json(
      { error: "La génération a échoué. Réessayez ou rédigez l'email manuellement." },
      { status: 502 }
    );
  }
}
