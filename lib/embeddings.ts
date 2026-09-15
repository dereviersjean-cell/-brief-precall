import { supabaseAdmin } from "./supabase";

export type SimilarReference = {
  id: string;
  client_name: string | null;
  sector: string | null;
  company_size: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
  similarity: number;
};

export async function generateEmbeddingsBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return [];
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const BATCH = 20;
  const results: (number[] | null)[] = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    try {
      const response = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "voyage-3", input: batch }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Voyage AI ${response.status}: ${body}`);
      }
      const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
      results.push(...data.data.map((d) => d.embedding));
    } catch (err) {
      console.warn("[embeddings] batch failed:", err);
      results.push(...batch.map(() => null as number[] | null));
    }
  }

  return results;
}

// inputType "query" pour un texte court comparé à des documents plus longs
// (recherche de références) : Voyage optimise alors l'embedding pour ce cas
// asymétrique. Compatible avec les embeddings déjà stockés sans inputType.
export async function generateEmbedding(text: string, inputType?: "query" | "document"): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "voyage-3", input: [text], ...(inputType ? { input_type: inputType } : {}) }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage AI ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0].embedding;
}

export async function findSimilarReferences(
  userId: string,
  prospectContext: string,
  limit = 5
): Promise<SimilarReference[]> {
  const embedding = await generateEmbedding(prospectContext, "query");

  // supabaseAdmin, pas le client anon : la RLS de client_references fait
  // renvoyer au client anon une liste vide, sans erreur — aucun brief n'a
  // reçu de référence entre le 01/07 et le 15/09/2026 sans que rien ne le
  // signale. Le filtrage par utilisateur est assuré par match_user_id.
  const { data, error } = await supabaseAdmin.rpc("match_client_references", {
    query_embedding: embedding,
    match_user_id: userId,
    match_count: limit,
  });

  if (error) throw error;
  return (data ?? []) as SimilarReference[];
}
