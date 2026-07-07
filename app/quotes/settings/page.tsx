import { redirect } from "next/navigation";
import { getQuoteSettings, listQuoteOffers } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import QuoteSettingsClient from "./QuoteSettingsClient";

export default async function QuoteSettingsPage() {
  const userId = await getEffectiveUserId();
  if (!userId) {
    redirect("/login");
  }

  const [settings, offers] = await Promise.all([
    getQuoteSettings(userId),
    listQuoteOffers(userId),
  ]);

  return <QuoteSettingsClient initialSettings={settings} initialOffers={offers} />;
}
