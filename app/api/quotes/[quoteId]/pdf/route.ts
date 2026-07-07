import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getQuoteWithLines } from "@/lib/db";
import { renderQuoteToPdfBuffer } from "@/lib/pdf/QuoteDocument";

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

  const buffer = await renderQuoteToPdfBuffer(quote, quote.lines);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quote_number}.pdf"`,
    },
  });
}
