import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmTokens, saveCrmTokens, saveClientReferences } from "@/lib/db";
import { getWonDeals, refreshHubspotToken } from "@/lib/crm/hubspot";
import type { HubspotDeal } from "@/lib/crm/hubspot";
import type { ClientReference } from "@/lib/db";

function formatAmount(amount: string | null): string | null {
  if (!amount) return null;
  const num = parseFloat(amount);
  if (isNaN(num)) return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(num);
}

function buildReference(deal: HubspotDeal): Omit<ClientReference, "id" | "user_id" | "created_at"> {
  const result = formatAmount(deal.amount);
  const rawParts = [
    deal.dealname ? `Deal : ${deal.dealname}` : null,
    result ? `Valeur : ${result}` : null,
    deal.closedate ? `Clôturé le : ${deal.closedate.slice(0, 10)}` : null,
  ].filter(Boolean);

  return {
    client_name: deal.dealname,
    sector: null,
    company_size: null,
    problem: null,
    solution: null,
    result,
    raw_text: rawParts.join(" — "),
    source: "hubspot",
  };
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const tokens = await getCrmTokens(userId, "hubspot");
  if (!tokens) {
    return NextResponse.json({ error: "HubSpot non connecté." }, { status: 401 });
  }

  async function fetchDeals(accessToken: string): Promise<HubspotDeal[]> {
    return getWonDeals(accessToken);
  }

  let deals: HubspotDeal[];
  try {
    deals = await fetchDeals(tokens.access_token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("401")) {
      console.error("[hubspot/import-references] getWonDeals failed:", msg);
      return NextResponse.json({ error: "Erreur lors de la récupération des deals." }, { status: 500 });
    }

    console.log("[hubspot/import-references] Access token expired, refreshing...");
    let newTokens: Awaited<ReturnType<typeof refreshHubspotToken>>;
    try {
      newTokens = await refreshHubspotToken(tokens.refresh_token);
    } catch (refreshErr) {
      console.error("[hubspot/import-references] Token refresh failed:", refreshErr instanceof Error ? refreshErr.message : String(refreshErr));
      return NextResponse.json({ error: "Session HubSpot expirée. Reconnectez-vous." }, { status: 401 });
    }

    try {
      await saveCrmTokens(userId, "hubspot", newTokens.access_token, newTokens.refresh_token);
    } catch (saveErr) {
      console.warn("[hubspot/import-references] saveCrmTokens after refresh failed:", saveErr);
    }

    try {
      deals = await fetchDeals(newTokens.access_token);
    } catch (retryErr) {
      console.error("[hubspot/import-references] getWonDeals retry failed:", retryErr instanceof Error ? retryErr.message : String(retryErr));
      return NextResponse.json({ error: "Erreur lors de la récupération des deals après renouvellement." }, { status: 500 });
    }
  }

  if (deals.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const references = deals.map(buildReference);

  try {
    await saveClientReferences(userId, references);
  } catch (err) {
    console.error("[hubspot/import-references] saveClientReferences failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Erreur lors de la sauvegarde des références." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: references.length });
}
