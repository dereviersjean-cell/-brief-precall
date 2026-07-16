import { redirect } from "next/navigation";
import { listQuotesForUser } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import QuotesListClient from "./QuotesListClient";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) {
    redirect("/login");
  }

  const { error } = await searchParams;
  const quotes = await listQuotesForUser(userId);

  return <QuotesListClient quotes={quotes} missingCompanyInfo={error === "missing_company_info"} />;
}
