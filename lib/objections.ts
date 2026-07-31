import { supabaseAdmin } from "./supabase";
import { generateEmbedding } from "./embeddings";
import { listObjectionCategories } from "./db";
import { classifyAndEvaluateObjections, type TimedTurn } from "./objection-classifier";
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
  objections: CallObjection[],
  // Transcript complet — sert au classifieur à extraire les verbatims
  // (migration 007). Absent, tout le reste fonctionne, sans citations.
  transcript?: string | null,
  // Tours horodatés (calls.transcript_json) — permettent en plus de situer
  // l'objection dans l'enregistrement, donc de caler la vidéo dessus
  // (migration 009).
  turns?: TimedTurn[] | null
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
    objections,
    transcript,
    turns
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
        prospect_verbatim: o.prospectVerbatim,
        commercial_verbatim: o.commercialVerbatim,
        suggested_response: o.suggestedResponse,
        prospect_bullets: o.prospectBullets,
        commercial_bullets: o.commercialBullets,
        confidence: o.confidence,
        start_ms: o.startMs,
        end_ms: o.endMs,
      };
    })
  );

  const validRows = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  if (validRows.length === 0) return;

  // Idempotence par call (règle « UPSERT + contrainte UNIQUE » de CLAUDE.md,
  // qui manquait ici) : un call ré-analysé doit REMPLACER ses objections, pas
  // les empiler. Sans cela, trois calls d'Oliverlist ré-analysés 5 à 7 fois en
  // juillet 2026 avaient produit 72 lignes pour 13 objections réelles, et la
  // même objection s'affichait huit fois de suite dans le détail d'une
  // catégorie. Pas de contrainte UNIQUE possible ici : le texte de l'objection
  // est reformulé à chaque extraction, il ne peut pas servir de clé.
  //
  // Ordre volontaire — on insère AVANT de supprimer, et on ne supprime que les
  // ids relevés avant l'insertion : si l'insert échoue, l'ancienne version
  // reste en base plutôt que de laisser le call sans aucune objection.
  const { data: previous } = await supabaseAdmin
    .from("call_objections")
    .select("id")
    .eq("call_id", callId)
    .eq("organization_id", organizationId);
  const previousIds = ((previous ?? []) as { id: string }[]).map((r) => r.id);

  const purgePrevious = async () => {
    if (previousIds.length === 0) return;
    const { error: deleteError } = await supabaseAdmin.from("call_objections").delete().in("id", previousIds);
    if (deleteError) {
      // Non bloquant : on a bien la nouvelle version, il reste juste
      // l'ancienne à côté — le cas exact que ce code est censé éviter, donc
      // on le trace explicitement.
      console.error("[objections] purge des objections précédentes échouée (doublons possibles):", deleteError.message);
    }
  };

  const { error } = await supabaseAdmin.from("call_objections").insert(validRows);
  if (!error) {
    await purgePrevious();
    return;
  }

  // Pattern bug #14 : si les migrations 006/007/009 ne sont pas encore passées en prod,
  // l'insert entier échoue sur des colonnes inconnues et on perdrait
  // l'objection. On réessaie sur les seules colonnes historiques — la
  // bibliothèque continue de se remplir, sans classification.
  console.error(
    "[objections] insert avec classification échoué, retry sans les colonnes des migrations 006/007/009 :",
    error.message
  );
  const legacyRows = validRows.map(
    ({
      category_id,
      handling_quality,
      handling_comment,
      evaluated_against_playbook,
      classified_at,
      prospect_verbatim,
      commercial_verbatim,
      suggested_response,
      prospect_bullets,
      commercial_bullets,
      confidence,
      start_ms,
      end_ms,
      ...rest
    }) => rest
  );
  const { error: legacyError } = await supabaseAdmin.from("call_objections").insert(legacyRows);
  if (legacyError) throw legacyError;
  await purgePrevious();
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
