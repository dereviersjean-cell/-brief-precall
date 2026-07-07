import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { updateQuoteOffer, archiveQuoteOffer, type QuoteOfferInput } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { offerId } = await params;

  let body: Partial<QuoteOfferInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  try {
    await updateQuoteOffer(offerId, auth.userId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quotes/offers/:id] updateQuoteOffer failed:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { offerId } = await params;

  try {
    await archiveQuoteOffer(offerId, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quotes/offers/:id] archiveQuoteOffer failed:", err);
    return NextResponse.json({ error: "Erreur lors de l'archivage." }, { status: 500 });
  }
}
