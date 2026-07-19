import { supabaseAdmin } from "./supabase";
import { generateEmbedding } from "./embeddings";
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
export async function indexCallObjections(
  organizationId: string,
  callId: string,
  contactEmail: string | null,
  objections: CallObjection[]
): Promise<void> {
  if (objections.length === 0) return;

  const rows = await Promise.all(
    objections.map(async (o) => {
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
      };
    })
  );

  const validRows = rows.filter((r): r is NonNullable<typeof r> => r !== null);
  if (validRows.length === 0) return;

  const { error } = await supabaseAdmin.from("call_objections").insert(validRows);
  if (error) throw error;
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
