import { notFound } from "next/navigation";
import { getQuoteByPublicToken, markQuoteAsViewed } from "@/lib/db";
import QuotePublicClient from "./QuotePublicClient";

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const quote = await getQuoteByPublicToken(token);
  if (!quote) {
    notFound();
  }

  // Fire-and-forget — the DB-level `.is("viewed_at", null)` guard makes this
  // safe to call on every page load, first-open-only by construction.
  markQuoteAsViewed(token).catch((err) => {
    console.error("[q/:token] markQuoteAsViewed failed (non-blocking):", err);
  });

  return <QuotePublicClient token={token} quote={quote} />;
}
