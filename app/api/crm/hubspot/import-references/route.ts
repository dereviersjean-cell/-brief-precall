import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getCrmTokens, saveCrmTokens, saveClientReferences } from "@/lib/db";
import { getDealCompanies, getDealPipelines, getWonDeals, refreshHubspotToken, WON_DEALS_MAX } from "@/lib/crm/hubspot";
import { buildReference } from "@/lib/crm/hubspot-references";

// 1 451 deals chez un client réel : 15 recherches espacées, 15 lectures
// d'associations, 15 lectures d'entreprises, puis les embeddings par tranches.
export const maxDuration = 300;

// Import des deals gagnés du client en références citables.
//
// ⚠ Le choix du pipeline est le cœur de cette route, pas un ornement. Avant le
// 24/11/2026 elle filtrait sur `dealstage = "closedwon"` : ce nom n'existe que
// dans le pipeline par défaut d'un portail neuf, si bien que l'import rendait
// zéro chez un vrai client. Et le remplacer par « toutes les étapes gagnées »
// est pire : sur le portail d'Oliverlist, le pipeline « Suivi » compte comme
// gagnées des étapes qui sont des états de vie de compte — Stand-by, Paiements
// refusés, Recouvrement, Deleted. On importerait des comptes supprimés comme
// références à citer en rendez-vous. D'où : le client désigne SON pipeline de
// vente, et on ne prend que les étapes gagnées de celui-là.

type Ran<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

/**
 * Exécute un appel HubSpot, en renouvelant le jeton une fois s'il a expiré.
 * Partagé par les deux verbes : la lecture des pipelines expire aussi bien que
 * celle des deals, et dupliquer cette danse était la moitié de l'ancien
 * fichier.
 */
async function withHubspotToken<T>(userId: string, run: (accessToken: string) => Promise<T>): Promise<Ran<T>> {
  const tokens = await getCrmTokens(userId, "hubspot");
  if (!tokens) {
    return { ok: false, response: NextResponse.json({ error: "HubSpot non connecté." }, { status: 401 }) };
  }

  try {
    return { ok: true, value: await run(tokens.access_token) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("401")) {
      console.error("[hubspot/import-references] appel HubSpot en échec:", msg);
      return { ok: false, response: NextResponse.json({ error: "Erreur HubSpot." }, { status: 500 }) };
    }

    let renewed: Awaited<ReturnType<typeof refreshHubspotToken>>;
    try {
      renewed = await refreshHubspotToken(tokens.refresh_token);
    } catch {
      return { ok: false, response: NextResponse.json({ error: "Session HubSpot expirée. Reconnectez-vous." }, { status: 401 }) };
    }
    try {
      await saveCrmTokens(userId, "hubspot", renewed.access_token, renewed.refresh_token);
    } catch (saveErr) {
      console.warn("[hubspot/import-references] saveCrmTokens après renouvellement:", saveErr);
    }

    try {
      return { ok: true, value: await run(renewed.access_token) };
    } catch (retryErr) {
      console.error("[hubspot/import-references] échec après renouvellement:", retryErr instanceof Error ? retryErr.message : String(retryErr));
      return { ok: false, response: NextResponse.json({ error: "Erreur HubSpot." }, { status: 500 }) };
    }
  }
}

/**
 * Les pipelines du portail, avec le nombre de deals gagnés de chacun : c'est
 * ce chiffre qui permet au client de reconnaître son pipeline de vente sans
 * deviner. Un pipeline sans étape gagnée n'est pas proposé.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const ran = await withHubspotToken(auth.userId, async (accessToken) => {
    const pipelines = (await getDealPipelines(accessToken)).filter((p) => p.wonStages.length > 0);
    return Promise.all(
      pipelines.map(async (p) => ({
        id: p.id,
        label: p.label,
        wonStages: p.wonStages.map((s) => s.label),
        // `max: 1` : on ne veut que le total, pas les deals.
        total: (await getWonDeals(accessToken, { stageIds: p.wonStages.map((s) => s.id), max: 1 })).total,
      }))
    );
  });
  if (!ran.ok) return ran.response;
  return NextResponse.json({ pipelines: ran.value, max: WON_DEALS_MAX });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const body = (await request.json().catch(() => null)) as { pipelineId?: unknown } | null;
  const pipelineId = typeof body?.pipelineId === "string" ? body.pipelineId : null;
  if (!pipelineId) {
    return NextResponse.json({ error: "Choisissez le pipeline à importer." }, { status: 400 });
  }

  const ran = await withHubspotToken(userId, async (accessToken) => {
    const pipeline = (await getDealPipelines(accessToken)).find((p) => p.id === pipelineId);
    // Les étapes sont relues ici plutôt que reçues du navigateur : elles
    // décident de ce qu'on importe, elles ne viennent pas du client.
    if (!pipeline || pipeline.wonStages.length === 0) return null;
    const won = await getWonDeals(accessToken, { stageIds: pipeline.wonStages.map((s) => s.id) });
    // L'entreprise liée porte le secteur, l'effectif et la description : sans
    // elle, un deal gagné ne donne qu'un nom et une date (25/11/2026).
    const companies = await getDealCompanies(accessToken, won.deals.map((d) => d.id));
    return { ...won, companies };
  });
  if (!ran.ok) return ran.response;
  if (ran.value === null) {
    return NextResponse.json({ error: "Ce pipeline n'existe plus, ou n'a aucune étape gagnée." }, { status: 404 });
  }

  const { deals, companies, total } = ran.value;
  if (deals.length === 0) return NextResponse.json({ ok: true, count: 0, total: 0 });

  try {
    // replaceSource : réimporter refait l'ensemble des références venues de
    // HubSpot au lieu de les empiler. Celles saisies à la main ou importées
    // d'un fichier ne sont pas touchées.
    await saveClientReferences(
      userId,
      deals.map((d) => buildReference(d, companies.get(d.id) ?? null)),
      { replaceSource: "hubspot" }
    );
  } catch (err) {
    console.error("[hubspot/import-references] saveClientReferences en échec:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Erreur lors de la sauvegarde des références." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: deals.length, total });
}
