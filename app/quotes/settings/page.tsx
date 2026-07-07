import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getQuoteSettings, listQuoteOffers } from "@/lib/db";
import QuoteSettingsClient from "./QuoteSettingsClient";

export default async function QuoteSettingsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;
  if (!userId) {
    redirect("/login");
  }

  const [settings, offers] = await Promise.all([
    getQuoteSettings(userId),
    listQuoteOffers(userId),
  ]);

  return <QuoteSettingsClient initialSettings={settings} initialOffers={offers} />;
}
