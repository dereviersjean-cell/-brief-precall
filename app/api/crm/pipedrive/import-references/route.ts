import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmTokens, saveCrmTokens, saveClientReferences } from "@/lib/db";
import { getWonDeals, refreshPipedriveToken } from "@/lib/crm/pipedrive";
import type { PipedriveDeal } from "@/lib/crm/pipedrive";
import type { ClientReference } from "@/lib/db";

function formatResult(value: number, currency: string): string {
  if (!value) return "";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 })
    .format(value);
}

function buildReference(deal: PipedriveDeal): Omit<ClientReference, "id" | "user_id" | "created_at"> {
  const clientName = deal.org_name ?? deal.title;
  const result = deal.value ? formatResult(deal.value, deal.currency) : null;

  const rawParts = [
    deal.title,
    deal.org_name ? `Organisation : ${deal.org_name}` : null,
    deal.person_name ? `Contact : ${deal.person_name}` : null,
    result ? `Valeur : ${result}` : null,
    deal.won_time ? `Gagné le : ${deal.won_time.slice(0, 10)}` : null,
  ].filter(Boolean);

  return {
    client_name: clientName,
    sector: null,
    company_size: null,
    problem: null,
    solution: null,
    result,
    raw_text: rawParts.join(" — "),
    source: "pipedrive",
  };
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const tokens = await getCrmTokens(userId, "pipedrive");
  if (!tokens) {
    return NextResponse.json({ error: "Pipedrive non connecté." }, { status: 401 });
  }

  const apiDomain = tokens.api_domain ?? "api.pipedrive.com";

  async function fetchDeals(accessToken: string): Promise<PipedriveDeal[]> {
    return getWonDeals(accessToken, apiDomain);
  }

  let deals: PipedriveDeal[];
  try {
    deals = await fetchDeals(tokens.access_token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("401")) {
      console.error("[import-references] getWonDeals failed:", msg);
      return NextResponse.json({ error: "Erreur lors de la récupération des deals." }, { status: 500 });
    }

    // Access token expired — refresh and retry
    console.log("[import-references] Access token expired, refreshing...");
    let newTokens: Awaited<ReturnType<typeof refreshPipedriveToken>>;
    try {
      newTokens = await refreshPipedriveToken(tokens.refresh_token);
    } catch (refreshErr) {
      console.error("[import-references] Token refresh failed:", refreshErr instanceof Error ? refreshErr.message : String(refreshErr));
      return NextResponse.json({ error: "Session Pipedrive expirée. Reconnectez-vous." }, { status: 401 });
    }

    try {
      await saveCrmTokens(userId, "pipedrive", newTokens.access_token, newTokens.refresh_token, newTokens.api_domain);
    } catch (saveErr) {
      console.warn("[import-references] saveCrmTokens after refresh failed:", saveErr);
    }

    try {
      deals = await fetchDeals(newTokens.access_token);
    } catch (retryErr) {
      console.error("[import-references] getWonDeals retry failed:", retryErr instanceof Error ? retryErr.message : String(retryErr));
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
    console.error("[import-references] saveClientReferences failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Erreur lors de la sauvegarde des références." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: references.length });
}
