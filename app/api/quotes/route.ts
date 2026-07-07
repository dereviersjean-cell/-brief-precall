import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { listQuotesForUser, createQuote, type QuoteDataInput } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const quotes = await listQuotesForUser(auth.userId);
  return NextResponse.json(quotes);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

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
    const id = await createQuote(auth.userId, body);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[quotes] createQuote failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
