import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { readPromptConfig, DEFAULT_QUOTE_GENERATION_PROMPT } from "@/lib/admin-config";
import {
  getContactById,
  getCallContextForContact,
  getQuoteSettings,
  listQuoteOffers,
  getGoogleTokens,
  getUserProfile,
  type QuoteGenerationCallContext,
  type QuoteOffer,
} from "@/lib/db";
import { refreshGoogleAccessToken, getEmailHistory, type GmailMessage } from "@/lib/gmail";
import { extractJsonObject } from "@/lib/ai-json";

export type GeneratedQuoteLine = {
  offer_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  discount_type: "percent" | "amount" | null;
  discount_value: number;
};

export type GeneratedQuoteDraft = {
  lines: GeneratedQuoteLine[];
  notes: string;
  validity_days: number;
};

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
      if (c.strengths.length > 0) parts.push(`Points forts : ${c.strengths.join("; ")}`);
      if (c.weaknesses.length > 0) parts.push(`Axes d'amélioration : ${c.weaknesses.join("; ")}`);
      if (c.objections.length > 0) {
        parts.push(`Objections : ${c.objections.map((o) => `${o.objection} (réponse apportée : ${o.response})`).join("; ")}`);
      }
      if (c.next_steps.length > 0) parts.push(`Prochaines étapes convenues : ${c.next_steps.join("; ")}`);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");
}

function formatCatalog(offers: QuoteOffer[]): string {
  if (offers.length === 0) return "Aucune offre dans le catalogue.";
  return offers
    .map(
      (o) =>
        `- id: ${o.id} | ${o.name} | ${o.unit_price}€ / ${o.unit} | TVA ${o.vat_rate}%${o.description ? ` | ${o.description}` : ""}`
    )
    .join("\n");
}

function sanitizeDraft(raw: unknown, defaultVatRate: number): GeneratedQuoteDraft {
  const obj = (raw ?? {}) as Partial<GeneratedQuoteDraft>;
  const rawLines = Array.isArray(obj.lines) ? obj.lines : [];

  const lines = rawLines
    .filter((l): l is GeneratedQuoteLine => !!l && typeof l === "object" && typeof l.name === "string" && l.name.trim() !== "")
    .map((l) => ({
      offer_id: typeof l.offer_id === "string" ? l.offer_id : null,
      name: l.name,
      description: typeof l.description === "string" ? l.description : null,
      quantity: typeof l.quantity === "number" && l.quantity > 0 ? l.quantity : 1,
      unit: typeof l.unit === "string" && l.unit.trim() !== "" ? l.unit : "unité",
      unit_price: typeof l.unit_price === "number" && l.unit_price >= 0 ? l.unit_price : 0,
      vat_rate: typeof l.vat_rate === "number" ? l.vat_rate : defaultVatRate,
      discount_type: l.discount_type === "percent" || l.discount_type === "amount" ? l.discount_type : null,
      discount_value: typeof l.discount_value === "number" && l.discount_value >= 0 ? l.discount_value : 0,
    }));

  const validityDays =
    typeof obj.validity_days === "number" && obj.validity_days > 0
      ? Math.min(60, Math.max(7, Math.round(obj.validity_days)))
      : 30;

  return {
    lines,
    notes: typeof obj.notes === "string" ? obj.notes : "",
    validity_days: validityDays,
  };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  let contactId: string;
  try {
    ({ contactId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!contactId || typeof contactId !== "string") {
    return NextResponse.json({ error: "contactId requis." }, { status: 400 });
  }

  const contact = await getContactById(contactId, auth.userId);
  if (!contact) {
    return NextResponse.json({ error: "Contact introuvable." }, { status: 404 });
  }

  const [settings, offers, profile, calls] = await Promise.all([
    getQuoteSettings(auth.userId),
    listQuoteOffers(auth.userId),
    getUserProfile(auth.userId),
    getCallContextForContact(auth.userId, contact.email),
  ]);

  if (!settings) {
    return NextResponse.json({ error: "Configurez d'abord vos paramètres devis." }, { status: 400 });
  }

  let emails: GmailMessage[] = [];
  try {
    const { refreshToken } = await getGoogleTokens(auth.userId);
    if (refreshToken) {
      const accessToken = await refreshGoogleAccessToken(refreshToken);
      emails = await getEmailHistory(accessToken, contact.email);
    }
  } catch (err) {
    console.log(
      "[quotes/generate] email history fetch failed (non-blocking):",
      err instanceof Error ? err.message : String(err)
    );
  }

  const basePrompt = (await readPromptConfig("quote_generation_prompt")) ?? DEFAULT_QUOTE_GENERATION_PROMPT;

  const contextPrompt = `INFOS ENTREPRISE DU COMMERCIAL

Société : ${settings.company_name ?? "Non renseigné"}
${profile?.product_description ? `Ce qu'elle vend : ${profile.product_description}` : ""}

INFOS CONTACT / PROSPECT

Email : ${contact.email}
Société : ${contact.company_name ?? "Non renseigné"}
${contact.last_call_summary ? `Dernier résumé connu : ${contact.last_call_summary}` : ""}

HISTORIQUE DES CALLS ANALYSÉS

${formatCalls(calls)}

HISTORIQUE DES EMAILS

${formatEmails(emails)}

CATALOGUE D'OFFRES DISPONIBLES (utilise l'id exact pour offer_id)

${formatCatalog(offers)}`;

  let raw = "";
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: basePrompt,
      messages: [{ role: "user", content: contextPrompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock?.type === "text" ? textBlock.text : "";
    const parsed = JSON.parse(extractJsonObject(raw)) as unknown;

    return NextResponse.json(sanitizeDraft(parsed, settings.default_vat_rate));
  } catch (err) {
    console.error(
      "[quotes/generate] Claude API failed:",
      err instanceof Error ? err.message : err,
      raw ? `\nRaw Claude response:\n${raw}` : "(no response captured — API call itself failed)"
    );
    return NextResponse.json(
      { error: "La génération a échoué. Réessayez ou remplissez manuellement." },
      { status: 502 }
    );
  }
}
