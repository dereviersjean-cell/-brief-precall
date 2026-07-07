import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getQuoteWithLines, updateQuote, deleteQuote, type QuoteDataInput } from "@/lib/db";

export async function GET(
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
  return NextResponse.json(quote);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { quoteId } = await params;

  let body: QuoteDataInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!body.client_name || !body.client_name.trim() || !Array.isArray(body.lines)) {
    return NextResponse.json({ error: "client_name et lines requis." }, { status: 400 });
  }

  try {
    await updateQuote(quoteId, auth.userId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quotes/:id] updateQuote failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { quoteId } = await params;

  try {
    await deleteQuote(quoteId, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quotes/:id] deleteQuote failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
