import { NextRequest, NextResponse } from "next/server";
import { acceptQuoteByPublicToken, getUserEmail } from "@/lib/db";
import { sendQuoteAcceptedEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const result = await acceptQuoteByPublicToken(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  try {
    const commercialEmail = await getUserEmail(result.quote.user_id);
    if (commercialEmail) {
      await sendQuoteAcceptedEmail({
        to: commercialEmail,
        quoteNumber: result.quote.quote_number,
        clientName: result.quote.client_name,
        totalTtc: result.quote.total_ttc,
        quoteId: result.quote.id,
      });
    }
  } catch (err) {
    console.error("[public/quotes/accept] notification email failed (non-blocking):", err);
  }

  return NextResponse.json({ ok: true });
}
