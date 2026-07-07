import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { listQuoteOffers, createQuoteOffer, type QuoteOfferInput } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const offers = await listQuoteOffers(auth.userId);
  return NextResponse.json(offers);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  let body: QuoteOfferInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!body.name || !body.name.trim() || typeof body.unit_price !== "number") {
    return NextResponse.json({ error: "name et unit_price requis." }, { status: 400 });
  }

  try {
    const id = await createQuoteOffer(auth.userId, body);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[quotes/offers] createQuoteOffer failed:", err);
    return NextResponse.json({ error: "Erreur lors de la création." }, { status: 500 });
  }
}
