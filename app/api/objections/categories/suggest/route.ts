import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { checkAiGenerationRateLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { getUserRole, getUserOrganizationId, listUnclassifiedObjectionsForClustering, listObjectionCategories } from "@/lib/db";
import { clusterObjections } from "@/lib/objection-clustering";
import { extractJsonObject } from "@/lib/ai-json";
import Anthropic from "@anthropic-ai/sdk";

// Propose au manager les catégories qui lui manquent, en regroupant les
// objections restées « non classées ». Deux étapes bien séparées :
//   1. le regroupement, purement local (embeddings déjà en base, aucun coût) ;
//   2. la mise en mots de chaque groupe, par Claude.
// Rien n'est créé ici : la route renvoie des propositions, le manager décide.
export const maxDuration = 120;

export type SuggestedCategory = {
  label: string;
  description: string;
  examplePhrasings: string[];
  occurrences: number;
  // Les objections réelles du groupe, pour que le manager vérifie que la
  // proposition tient avant de créer quoi que ce soit.
  samples: string[];
};

// Volontairement muet sur la manière de traiter l'objection : c'est
// l'expertise du directeur commercial, et c'est la référence contre laquelle
// ses commerciaux sont notés. Une méthode inventée par le modèle serait notée
// comme si elle venait de lui — la pire des confusions.
const SYSTEM_PROMPT = `Tu aides un directeur commercial B2B français à nommer des familles d'objections.

On te donne des groupes d'objections réellement soulevées par des prospects, déjà regroupées par proximité de sens. Pour CHAQUE groupe, produis :
- "label" : le nom court de la famille, tel qu'un directeur commercial la nommerait (3 à 6 mots, ex. « Validation par un associé », « Timing lié aux congés »).
- "description" : ce qui caractérise cette objection et ce qui la distingue des autres, en 1 à 2 phrases. Elle servira à la reconnaître dans les futurs calls, sois précis sur l'intention du prospect.
- "example_phrasings" : 2 à 4 formulations, REPRISES des objections du groupe, telles qu'un prospect les dirait à l'oral.

N'invente pas de manière de traiter l'objection : ce n'est pas ton rôle.

ÉLAGAGE — les groupes viennent d'un calcul de proximité, pas d'un jugement : ils contiennent des intrus. Deux objections peuvent parler du même sujet en exprimant des intentions opposées (« la conversion des leads achetés est trop faible » relève de la rentabilité, « on a été échaudés par un prestataire » de la mauvaise expérience passée — même sujet, familles différentes). Tu dois donc :
- ne retenir dans "example_phrasings" que les formulations qui relèvent VRAIMENT de la famille que tu nommes ;
- OMETTRE complètement un groupe du tableau de réponse s'il est trop hétérogène pour désigner une seule famille, ou s'il ne compte qu'une objection une fois les intrus écartés. Un groupe omis n'est pas un échec.

Réponds UNIQUEMENT en JSON strict, sans markdown :
{"categories": [{"index": 0, "label": "...", "description": "...", "example_phrasings": ["..."]}]}

"index" est le numéro du groupe fourni. Un objet par groupe, aucun oubli.`;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const rl = checkAiGenerationRateLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const organizationId = await getUserOrganizationId(auth.userId);
  if (!organizationId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const unclassified = await listUnclassifiedObjectionsForClustering(organizationId).catch(() => []);
  const clusters = clusterObjections(unclassified);

  if (clusters.length === 0) {
    return NextResponse.json({
      categories: [],
      unclassifiedCount: unclassified.length,
      // Message explicite : « aucun groupe » ne veut pas dire « rien à faire »,
      // ça peut simplement vouloir dire « pas encore assez de matière ».
      note:
        unclassified.length === 0
          ? "Toutes les objections sont rangées dans une catégorie."
          : "Pas encore de motif récurrent parmi les objections non classées — il en faut au moins deux qui se ressemblent vraiment.",
    });
  }

  const existing = await listObjectionCategories(organizationId).catch(() => []);
  const existingLabels = new Set(existing.map((c) => c.label.trim().toLowerCase()));

  const clusterBlock = clusters
    .map(
      (cluster, i) =>
        `Groupe ${i} (${cluster.members.length} objections) :\n` +
        cluster.members.map((m) => `  - ${m.verbatim ? `« ${m.verbatim} »` : m.objection}`).join("\n")
    )
    .join("\n\n");

  const existingBlock =
    existing.length > 0
      ? `\n\nCatégories qui existent DÉJÀ (ne les redonne pas, propose des familles distinctes) :\n${existing.map((c) => `- ${c.label}`).join("\n")}`
      : "";

  let raw = "";
  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `${clusterBlock}${existingBlock}` }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    raw = textBlock?.type === "text" ? textBlock.text : "";

    const parsed = JSON.parse(extractJsonObject(raw)) as {
      categories?: { index?: number; label?: string; description?: string; example_phrasings?: unknown }[];
    };
    if (!Array.isArray(parsed.categories)) {
      throw new Error("Réponse IA hors contrat (clé `categories` absente ou non-tableau)");
    }

    const byIndex = new Map(parsed.categories.filter((c) => typeof c.index === "number").map((c) => [c.index as number, c]));

    const categories: SuggestedCategory[] = clusters
      .map((cluster, i) => {
        const named = byIndex.get(i);
        if (!named?.label?.trim()) return null;
        return {
          label: named.label.trim(),
          description: typeof named.description === "string" ? named.description.trim() : "",
          examplePhrasings: Array.isArray(named.example_phrasings)
            ? named.example_phrasings.map((p) => String(p).trim()).filter(Boolean).slice(0, 4)
            : [],
          occurrences: cluster.members.length,
          samples: cluster.members.slice(0, 5).map((m) => m.verbatim || m.objection),
        };
      })
      .filter((c): c is SuggestedCategory => c !== null)
      // Un doublon d'une catégorie existante n'apporte rien — le modèle a pu
      // reproposer un nom déjà pris malgré la consigne.
      .filter((c) => !existingLabels.has(c.label.toLowerCase()));

    return NextResponse.json({ categories, unclassifiedCount: unclassified.length });
  } catch (err) {
    console.error(
      "[objections/categories/suggest] failed:",
      err instanceof Error ? err.message : String(err),
      raw ? `\nRaw Claude response:\n${raw}` : "(no response captured)"
    );
    return NextResponse.json({ error: "L'analyse a échoué. Réessayez." }, { status: 500 });
  }
}
