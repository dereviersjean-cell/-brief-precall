import { supabaseAdmin } from "./supabase";
import { generateEmbedding } from "./embeddings";

export async function upsertUser(
  email: string,
  name: string | null,
  avatarUrl: string | null
): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(
      { email, name, avatar_url: avatarUrl },
      { onConflict: "email" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string } | null;
}

export async function saveBrief(
  userId: string,
  companyName: string,
  contactEmail: string | null,
  calendarEventId: string | null,
  content: unknown,
  modelUsed: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("briefs")
    .insert({
      user_id: userId,
      company_name: companyName,
      contact_email: contactEmail,
      calendar_event_id: calendarEventId,
      content,
      model_used: modelUsed,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string } | null;
}

export async function getBriefsByUser(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("briefs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getBriefByEventId(
  userId: string,
  calendarEventId: string
) {
  const { data, error } = await supabaseAdmin
    .from("briefs")
    .select("*")
    .eq("user_id", userId)
    .eq("calendar_event_id", calendarEventId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type UserProfile = {
  id: string;
  user_id: string;
  company_name: string | null;
  product_description: string | null;
  icp: string | null;
  sector: string | null;
  created_at: string;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserProfile | null;
}

export async function upsertUserProfile(
  userId: string,
  profile: {
    company_name?: string | null;
    product_description?: string | null;
    icp?: string | null;
    sector?: string | null;
  }
): Promise<void> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .update(profile)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .insert({ user_id: userId, ...profile });
    if (error) throw error;
  }
}

export async function getBriefById(briefId: string): Promise<{ content: unknown; company_name: string | null } | null> {
  const { data, error } = await supabaseAdmin
    .from("briefs")
    .select("content, company_name")
    .eq("id", briefId)
    .maybeSingle();

  if (error) throw error;
  return data as { content: unknown; company_name: string | null } | null;
}

export async function getAdminConfig(key: string): Promise<unknown> {
  const { data, error } = await supabaseAdmin
    .from("admin_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data?.value ?? null;
}

export async function setAdminConfig(key: string, value: unknown): Promise<void> {
  const { error } = await supabaseAdmin
    .from("admin_config")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) throw error;
}

export type ClientReference = {
  id?: string;
  user_id?: string;
  client_name: string | null;
  sector: string | null;
  company_size: string | null;
  problem: string | null;
  solution: string | null;
  result: string | null;
  raw_text?: string | null;
  source?: string | null;
  embedding?: number[] | null;
  created_at?: string;
};

export async function saveClientReferences(
  userId: string,
  references: Array<Omit<ClientReference, "id" | "user_id" | "created_at">>
): Promise<void> {
  if (references.length === 0) return;

  const rows = await Promise.all(
    references.map(async (r) => {
      let embedding: number[] | null = null;
      if (r.embedding !== undefined) {
        // Pre-computed by caller (e.g. Inngest batch) — use as-is
        embedding = r.embedding;
      } else {
        const embeddingText = [r.sector, r.problem, r.solution, r.result, r.client_name]
          .filter(Boolean)
          .join(" ");
        if (embeddingText.trim()) {
          try {
            embedding = await generateEmbedding(embeddingText);
          } catch (err) {
            console.warn("[db] generateEmbedding failed, saving without embedding:", err);
          }
        }
      }
      return { ...r, user_id: userId, embedding };
    })
  );

  const { error } = await supabaseAdmin.from("client_references").insert(rows);
  if (error) throw error;
}

export async function getClientReferences(userId: string): Promise<ClientReference[]> {
  const { data, error } = await supabaseAdmin
    .from("client_references")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientReference[];
}

export async function getClientReferencesCount(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("client_references")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export type ImportJob = {
  id: string;
  user_id: string;
  status: "pending" | "processing" | "done" | "error";
  total: number;
  processed: number;
  chunks_total: number;
  chunks_done: number;
  created_at: string;
  updated_at: string;
};

export async function createImportJob(userId: string, total: number): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("import_jobs")
    .insert({ user_id: userId, total, status: "pending" })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateImportJob(
  jobId: string,
  patch: {
    status?: ImportJob["status"];
    processed?: number;
    total?: number;
    chunks_total?: number;
    chunks_done?: number;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("import_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw error;
}

export async function getLatestImportJob(userId: string): Promise<ImportJob | null> {
  const { data, error } = await supabaseAdmin
    .from("import_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as ImportJob | null;
}
