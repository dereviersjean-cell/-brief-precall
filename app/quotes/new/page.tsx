import { redirect } from "next/navigation";
import { getQuoteSettings, listQuoteOffers, listContactsForUser } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import QuoteEditor from "../QuoteEditor";

export default async function NewQuotePage() {
  const userId = await getEffectiveUserId();
  if (!userId) {
    redirect("/login");
  }

  const settings = await getQuoteSettings(userId);
  if (!settings || !settings.company_name) {
    redirect("/quotes?error=missing_company_info");
  }

  const [offers, contacts] = await Promise.all([listQuoteOffers(userId), listContactsForUser(userId)]);

  return <QuoteEditor mode="create" settings={settings} offers={offers} contacts={contacts} quote={null} />;
}
