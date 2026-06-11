import { supabase } from "./supabase";

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

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "voyage-3", input: [text] }),
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
  const embedding = await generateEmbedding(prospectContext);

  const { data, error } = await supabase.rpc("match_client_references", {
    query_embedding: embedding,
    match_user_id: userId,
    match_count: limit,
  });

  if (error) throw error;
  return (data ?? []) as SimilarReference[];
}
