import { redirect, notFound } from "next/navigation";
import { getQuoteSettings, listQuoteOffers, listContactsForUser, getQuoteWithLines } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import QuoteEditor from "../QuoteEditor";

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) {
    redirect("/login");
  }

  const settings = await getQuoteSettings(userId);
  if (!settings || !settings.company_name) {
    redirect("/quotes?error=missing_company_info");
  }

  const { quoteId } = await params;
  const [quote, offers, contacts] = await Promise.all([
    getQuoteWithLines(quoteId, userId),
    listQuoteOffers(userId),
    listContactsForUser(userId),
  ]);
  if (!quote) {
    notFound();
  }

  return (
    <QuoteEditor
      mode="edit"
      quoteId={quote.id}
      settings={settings}
      offers={offers}
      contacts={contacts}
      quote={quote}
    />
  );
}
