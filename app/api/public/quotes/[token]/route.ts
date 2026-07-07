import { NextRequest, NextResponse } from "next/server";
import { getQuoteByPublicToken, markQuoteAsViewed } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const quote = await getQuoteByPublicToken(token);
  if (!quote) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  // Fire-and-forget — first-open tracking shouldn't block the response.
  markQuoteAsViewed(token).catch((err) => {
    console.error("[public/quotes/:token] markQuoteAsViewed failed (non-blocking):", err);
  });

  return NextResponse.json(quote);
}
