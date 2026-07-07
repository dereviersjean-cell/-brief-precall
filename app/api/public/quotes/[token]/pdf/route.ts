import { NextRequest, NextResponse } from "next/server";
import { getQuoteByPublicToken } from "@/lib/db";
import { renderQuoteToPdfBuffer } from "@/lib/pdf/QuoteDocument";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const quote = await getQuoteByPublicToken(token);
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
