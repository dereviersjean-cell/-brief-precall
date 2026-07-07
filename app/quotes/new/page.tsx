import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getQuoteSettings, listQuoteOffers, listContactsForUser } from "@/lib/db";
import QuoteEditor from "../QuoteEditor";

export default async function NewQuotePage() {
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;
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
