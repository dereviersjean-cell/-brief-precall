import { supabaseAdmin } from "./supabase";
import { generateEmbedding } from "./embeddings";
import { listObjectionCategories } from "./db";
import { classifyAndEvaluateObjections } from "./objection-classifier";
import type { CallObjection } from "./db";

export type SimilarObjection = {
  id: string;
  call_id: string;
  contact_email: string | null;
  objection: string;
  response: string;
  created_at: string;
  similarity: number;
};

// Indexes objections into call_objections for team-wide semantic search
// (module Bibliothèque d'objections). Unlike lib/embeddings.ts's
// findSimilarReferences, uses supabaseAdmin (service_role) rather than the
// anon client — see CLAUDE.md "toujours service_role côté serveur"; the
// anon-client precedent in lib/embeddings.ts predates that rule being
// written down and isn't reproduced here.
// Classe aussi chaque objection dans une des catégories définies par le
// manager et note la réponse apportée (migration 006) — c'est le seul
// chokepoint par lequel passent toutes les écritures dans call_objections,
// donc le bon endroit pour garantir que rien n'entre en base non classé.
// Non bloquant : si le classifieur ou les catégories échouent, l'objection
// est indexée sans catégorie, comme avant.
export async function indexCallObjections(
  organizationId: string,
  callId: string,
  contactEmail: string | null,
  objections: CallObjection[]
): Promise<void> {
  if (objections.length === 0) return;

  const categories = await listObjectionCategories(organizationId).catch((err) => {
    console.warn(
      "[objections] listObjectionCategories failed, indexation sans catégorie (migration 006 pas encore appliquée ?):",
      err instanceof Error ? err.message : String(err)
    );
    return [];
  });

  const classified = await classifyAndEvaluateObjections(
    categories.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      handling_guidance: c.handlingGuidance,
      example_phrasings: c.examplePhrasings,
    })),
    objections
  );

  const rows = await Promise.all(
    classified.map(async (o) => {
      const embedding = await generateEmbedding(o.objection).catch((err) => {
        console.warn("[objections] generateEmbedding failed for one objection (skipped):", err instanceof Error ? err.message : String(err));
        return null;
      });
      if (!embedding) return null;
      return {
        organization_id: organizationId,
        call_id: callId,
        contact_email: contactEmail,
        objection: o.objection,
        response: o.response,
        embedding,
        category_id: o.categoryId,
        handling_quality: o.handlingQuality,
        handling_comment: o.handlingComment,
        evaluated_against_playbook: o.evaluatedAgainstPlaybook,
        classified_at: new Date().toISOString(),
      };
    })
  );

  const validRows = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  if (validRows.length === 0) return;

  const { error } = await supabaseAdmin.from("call_objections").insert(validRows);
  if (!error) return;

  // Pattern bug #14 : si la migration 006 n'est pas encore passée en prod,
  // l'insert entier échoue sur des colonnes inconnues et on perdrait
  // l'objection. On réessaie sur les seules colonnes historiques — la
  // bibliothèque continue de se remplir, sans classification.
  console.error(
    "[objections] insert avec classification échoué, retry sans les colonnes de la migration 006 :",
    error.message
  );
  const legacyRows = validRows.map(
    ({ category_id, handling_quality, handling_comment, evaluated_against_playbook, classified_at, ...rest }) => rest
  );
  const { error: legacyError } = await supabaseAdmin.from("call_objections").insert(legacyRows);
  if (legacyError) throw legacyError;
}

// Mirrors lib/embeddings.ts's findSimilarReferences — same shape (embed the
// query text, call a match_* RPC scoped to the caller, return with a
// similarity score) — but scoped to organization_id (team-wide knowledge,
// like the playbook) rather than user_id.
export async function findSimilarObjections(
  organizationId: string,
  objectionText: string,
  limit = 5
): Promise<SimilarObjection[]> {
  const embedding = await generateEmbedding(objectionText);

  const { data, error } = await supabaseAdmin.rpc("match_call_objections", {
    query_embedding: embedding,
    match_organization_id: organizationId,
    match_count: limit,
  });

  if (error) throw error;
  return (data ?? []) as SimilarObjection[];
}
