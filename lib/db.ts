import { supabaseAdmin } from "./supabase";
import { generateEmbedding } from "./embeddings";
import { computeQuoteTotals } from "./quote-calc";
import type { TranscriptJson } from "./recall";
import type { NotificationEventType, NotificationChannel, NotificationPreference } from "./notification-preferences";

export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

export type AuthProvider = "google" | "microsoft";

export type LoginResolution =
  | { status: "ok"; userId: string; role: UserRole | null }
  | { status: "disabled" }
  | { status: "conflict" };

type AuthUserRow = {
  id: string;
  disabled_at: string | null;
  role: UserRole | null;
  google_id: string | null;
  microsoft_id: string | null;
};

// Resolves (and creates/links as needed) the users row for a Google/Microsoft
// sign-in. Idempotent — safe to call once from the `signIn` callback (to
// decide whether to allow the login) and again from `jwt` (to read back the
// resolved id/role), since the second call just re-matches the same row.
export async function resolveUserForLogin(params: {
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: AuthProvider;
  providerId: string;
}): Promise<LoginResolution> {
  const { email, name, avatarUrl, provider, providerId } = params;
  const column = provider === "google" ? "google_id" : "microsoft_id";

  const { data: byProviderIdData, error: byProviderIdError } = await supabaseAdmin
    .from("users")
    .select("id, disabled_at, role, google_id, microsoft_id")
    .eq(column, providerId)
    .maybeSingle();
  if (byProviderIdError) throw byProviderIdError;
  const byProviderId = byProviderIdData as AuthUserRow | null;

  if (byProviderId) {
    if (byProviderId.disabled_at) return { status: "disabled" };
    const { error } = await supabaseAdmin
      .from("users")
      .update({ name, avatar_url: avatarUrl })
      .eq("id", byProviderId.id);
    if (error) throw error;
    return { status: "ok", userId: byProviderId.id, role: byProviderId.role };
  }

  const { data: byEmailData, error: byEmailError } = await supabaseAdmin
    .from("users")
    .select("id, disabled_at, role, google_id, microsoft_id")
    .eq("email", email)
    .maybeSingle();
  if (byEmailError) throw byEmailError;
  const byEmail = byEmailData as AuthUserRow | null;

  if (byEmail) {
    const existingProviderId = provider === "google" ? byEmail.google_id : byEmail.microsoft_id;
    if (existingProviderId && existingProviderId !== providerId) {
      return { status: "conflict" };
    }
    if (byEmail.disabled_at) return { status: "disabled" };

    const { error } = await supabaseAdmin
      .from("users")
      .update({ [column]: providerId, name, avatar_url: avatarUrl })
      .eq("id", byEmail.id);
    if (error) throw error;
    return { status: "ok", userId: byEmail.id, role: byEmail.role };
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("users")
    .insert({ email, name, avatar_url: avatarUrl, [column]: providerId })
    .select("id, role")
    .single();
  if (createError) throw createError;
  const createdRow = created as { id: string; role: UserRole | null };
  return { status: "ok", userId: createdRow.id, role: createdRow.role };
}

export async function saveGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null | undefined
): Promise<void> {
  const patch: Record<string, string> = { google_access_token: accessToken };
  if (refreshToken) patch.google_refresh_token = refreshToken;
  const { error } = await supabaseAdmin.from("users").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function getGoogleTokens(
  userId: string
): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("google_access_token, google_refresh_token")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  const row = data as { google_access_token: string | null; google_refresh_token: string | null } | null;
  return {
    accessToken: row?.google_access_token ?? null,
    refreshToken: row?.google_refresh_token ?? null,
  };
}

export async function getAllUsersWithRecallCalendar(): Promise<{ id: string; email: string; recall_calendar_id: string }[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, recall_calendar_id")
    .not("recall_calendar_id", "is", null);
  if (error) throw error;
  return (data ?? []) as { id: string; email: string; recall_calendar_id: string }[];
}

export async function saveRecallCalendarId(userId: string, calendarId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ recall_calendar_id: calendarId })
    .eq("id", userId);
  if (error) throw error;
}

export async function clearRecallCalendarId(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ recall_calendar_id: null })
    .eq("id", userId);
  if (error) throw error;
}

export async function getRecallCalendarId(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("recall_calendar_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { recall_calendar_id: string | null } | null)?.recall_calendar_id ?? null;
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
    .upsert({
      user_id: userId,
      company_name: companyName,
      contact_email: contactEmail,
      calendar_event_id: calendarEventId,
      content,
      model_used: modelUsed,
    }, { onConflict: "user_id,calendar_event_id" })
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

export async function getBriefByCalendarEventIdGlobal(calendarEventId: string): Promise<{
  user_id: string;
  company_name: string | null;
  contact_email: string | null;
} | null> {
  const { data, error } = await supabaseAdmin
    .from("briefs")
    .select("user_id, company_name, contact_email")
    .eq("calendar_event_id", calendarEventId)
    .maybeSingle();
  if (error) throw error;
  return data as { user_id: string; company_name: string | null; contact_email: string | null } | null;
}

export type CallData = {
  user_id: string;
  calendar_event_id: string | null;
  contact_email: string | null;
  company_name: string | null;
  transcript: string;
  status: string;
  duration_seconds: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  recall_bot_id: string | null;
  recording_id: string | null;
  transcript_id: string | null;
  participant_count?: number | null;
  // Optional — populated by the bot-webhook when buildTranscriptJson/
  // resolveSpeakerNames succeed; absent (not merely null) for any call path
  // that doesn't compute them, which upsert simply leaves untouched.
  transcript_json?: TranscriptJson | null;
  speaker_names_override?: Record<string, string>;
};

// Upsert, not a plain insert — the bot-webhook's transcript.done handler does
// slow synchronous work (transcript fetch, Claude analysis, follow-up email)
// before responding, so Recall can and does retry the same webhook delivery;
// without a conflict target on recall_bot_id each retry created a brand-new
// duplicate call row (and its own independent, non-deterministic analysis).
// DO UPDATE (the default) rather than DO NOTHING, so `.select("id")` always
// returns the existing row's id and callers downstream keep working normally.
export async function createCall(data: CallData): Promise<{ id: string }> {
  const { data: row, error } = await supabaseAdmin
    .from("calls")
    .upsert(data, { onConflict: "recall_bot_id" })
    .select("id")
    .single();
  if (error) throw error;
  return row as { id: string };
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

// Scoped to userId (not just the reference id) so a request can't delete
// another user's reference by guessing an id.
export async function deleteClientReference(userId: string, referenceId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("client_references")
    .delete()
    .eq("id", referenceId)
    .eq("user_id", userId);
  if (error) throw error;
}

// Manual single-reference creation (the "+ Ajouter une référence" form) —
// distinct from saveClientReferences (bulk import from a file or CRM) since
// callers here want the created row back immediately (id + embedding
// presence) to render it without a full refetch.
export async function createClientReference(
  userId: string,
  ref: Omit<ClientReference, "id" | "user_id" | "created_at" | "embedding">
): Promise<ClientReference> {
  const embeddingText = [ref.sector, ref.problem, ref.solution, ref.result, ref.client_name].filter(Boolean).join(" ");
  let embedding: number[] | null = null;
  if (embeddingText.trim()) {
    try {
      embedding = await generateEmbedding(embeddingText);
    } catch (err) {
      console.warn("[db] generateEmbedding failed, saving without embedding:", err);
    }
  }

  const { data, error } = await supabaseAdmin
    .from("client_references")
    .insert({ ...ref, user_id: userId, embedding })
    .select("*")
    .single();
  if (error) throw error;
  return data as ClientReference;
}

// Editing a reference changes the very text the embedding is derived from
// (sector/problem/solution/result/client_name — see saveClientReferences),
// so the embedding is always regenerated here rather than left stale. If
// regeneration fails, the previous embedding is kept rather than nulled out
// — a transient Voyage AI error shouldn't silently drop a reference from
// future brief matching.
export async function updateClientReference(
  userId: string,
  referenceId: string,
  patch: Partial<Pick<ClientReference, "client_name" | "sector" | "company_size" | "problem" | "solution" | "result">>
): Promise<ClientReference> {
  const { data: current, error: fetchError } = await supabaseAdmin
    .from("client_references")
    .select("client_name, sector, company_size, problem, solution, result, embedding")
    .eq("id", referenceId)
    .eq("user_id", userId)
    .single();
  if (fetchError) throw fetchError;

  const merged = { ...(current as Record<string, unknown>), ...patch } as ClientReference;
  const embeddingText = [merged.sector, merged.problem, merged.solution, merged.result, merged.client_name]
    .filter(Boolean)
    .join(" ");

  let embedding = current.embedding as number[] | null;
  if (embeddingText.trim()) {
    try {
      embedding = await generateEmbedding(embeddingText);
    } catch (err) {
      console.warn("[db] generateEmbedding failed on update, keeping previous embedding:", err);
    }
  } else {
    embedding = null;
  }

  const { data, error } = await supabaseAdmin
    .from("client_references")
    .update({ ...patch, embedding })
    .eq("id", referenceId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as ClientReference;
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

export type AnalysisDimensionScore = { score: number; description: string };

// The 4 historical keys stay explicitly typed (non-optional) so existing
// direct accesses like `scores.opening_framing.score` in /feedback and
// /team keep type-checking unchanged — sous-étape B doesn't touch those
// files. The index signature is what makes this "dynamic": any other
// dimension key from a custom playbook is covered by it, typed as
// AnalysisDimensionScore | number so it stays assignable alongside the
// numeric global_score.
export type AnalysisScores = {
  global_score: number;
  opening_framing: AnalysisDimensionScore;
  pain_point: AnalysisDimensionScore;
  pitch_demo: AnalysisDimensionScore;
  next_step: AnalysisDimensionScore;
  [dimensionKey: string]: AnalysisDimensionScore | number;
};

export type CallAnalysisRow = {
  id: string;
  scores: AnalysisScores | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  objections: string[] | null;
  next_steps: string[] | null;
  summary: string | null;
  sentiment: string | null;
  // Added sous-étape D — null for analyses saved before sous-étape B (or
  // where getPlaybookSnapshotForUser's caller didn't pass one); consumers
  // should go through getEffectiveScoresForDisplay rather than reading this
  // directly, so that fallback is handled in one place.
  playbook_snapshot: PlaybookSnapshot | null;
  // Generated once, on demand, by POST /api/feedback/[id]/key-points (not by
  // analyzeCall) — null until the first person opens the call's analysis
  // page, then cached here permanently. See lib/key-points.ts.
  key_points: string | null;
  key_points_generated_at: string | null;
};

// PostgREST returns an embedded call_analysis(...) as a plain object now that
// call_analysis.call_id has a UNIQUE constraint (it infers a 1:1 relation
// instead of 1:many) — previously it was an array, and this repo has several
// `?.[0]` reads left over from that. Handles both shapes defensively.
function normalizeCallAnalysis<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export type CallWithAnalysis = {
  id: string;
  // The call owner's id — always the actual commercial who took the call,
  // even when fetched via getCallWithAnalysisForManager (which resolves its
  // own `ownerId` internally but previously never returned it). Needed by
  // page.tsx to resolve the commercial's name for computeConversationAnalytics
  // regardless of whether the owner or a linked manager is viewing.
  user_id: string;
  contact_email: string | null;
  company_name: string | null;
  created_at: string;
  started_at: string | null;
  status: string;
  duration_seconds: number | null;
  participant_count: number | null;
  follow_up_email: { subject: string; body: string } | null;
  follow_up_sent_at: string | null;
  recall_bot_id: string | null;
  recording_id: string | null;
  analysis: CallAnalysisRow | null;
  // Raw "Speaker: text" transcript, one turn per line (see transcriptToText
  // in lib/recall.ts) — already persisted on calls.transcript at ingest time
  // (app/api/recall/bot-webhook/route.ts), never re-fetched from Recall.
  // Deliberately not selected by getCallsWithAnalysis below (explicitly null
  // there): that function backs list views where pulling a full transcript
  // per row would bloat the payload for no reason.
  transcript: string | null;
  // Normalized speaker-turns with ms timestamps (see buildTranscriptJson in
  // lib/recall.ts) — null for calls ingested before sous-étape A, in which
  // case the UI falls back to parsing `transcript` above with no timestamps.
  transcript_json: TranscriptJson | null;
  // { speaker_id: display_name }, seeded once at ingestion by
  // resolveSpeakerNames and editable afterwards via updateCallSpeakerNames.
  // {} (not null) for historical calls — nothing to override yet.
  speaker_names_override: Record<string, string>;
};

export async function getCallsWithAnalysis(userId: string): Promise<CallWithAnalysis[]> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select(
      "id, contact_email, company_name, created_at, started_at, status, duration_seconds, participant_count, follow_up_email, follow_up_sent_at, recall_bot_id, recording_id, call_analysis(id, scores, strengths, weaknesses, objections, next_steps, summary, sentiment, playbook_snapshot, key_points, key_points_generated_at)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const analysis = normalizeCallAnalysis(row.call_analysis as CallAnalysisRow | CallAnalysisRow[] | null);
    return {
      id: row.id as string,
      user_id: userId,
      contact_email: row.contact_email as string | null,
      company_name: row.company_name as string | null,
      created_at: row.created_at as string,
      status: row.status as string,
      started_at: row.started_at as string | null,
      duration_seconds: row.duration_seconds as number | null,
      participant_count: row.participant_count as number | null,
      follow_up_email: row.follow_up_email as { subject: string; body: string } | null,
      follow_up_sent_at: row.follow_up_sent_at as string | null,
      recall_bot_id: row.recall_bot_id as string | null,
      recording_id: row.recording_id as string | null,
      analysis,
      transcript: null,
      transcript_json: null,
      speaker_names_override: {},
    };
  });
}

export async function getCallWithAnalysis(
  callId: string,
  userId: string
): Promise<CallWithAnalysis | null> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select(
      "id, contact_email, company_name, created_at, started_at, status, duration_seconds, participant_count, follow_up_email, follow_up_sent_at, recall_bot_id, recording_id, transcript, transcript_json, speaker_names_override, call_analysis(id, scores, strengths, weaknesses, objections, next_steps, summary, sentiment, playbook_snapshot, key_points, key_points_generated_at)"
    )
    .eq("id", callId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const analysis = normalizeCallAnalysis(row.call_analysis as CallAnalysisRow | CallAnalysisRow[] | null);
  return {
    id: row.id as string,
    user_id: userId,
    contact_email: row.contact_email as string | null,
    company_name: row.company_name as string | null,
    created_at: row.created_at as string,
    status: row.status as string,
    started_at: row.started_at as string | null,
    duration_seconds: row.duration_seconds as number | null,
    participant_count: row.participant_count as number | null,
    follow_up_email: row.follow_up_email as { subject: string; body: string } | null,
    follow_up_sent_at: row.follow_up_sent_at as string | null,
    recall_bot_id: row.recall_bot_id as string | null,
    recording_id: row.recording_id as string | null,
    analysis,
    transcript: row.transcript as string | null,
    transcript_json: row.transcript_json as TranscriptJson | null,
    speaker_names_override: (row.speaker_names_override as Record<string, string> | null) ?? {},
  };
}

export async function getCallWithAnalysisForManager(
  callId: string,
  managerId: string
): Promise<CallWithAnalysis | null> {
  const { data: call, error: callError } = await supabaseAdmin
    .from("calls")
    .select("user_id")
    .eq("id", callId)
    .maybeSingle();
  if (callError) throw callError;
  if (!call) return null;
  const ownerId = (call as { user_id: string }).user_id;

  const { data: link, error: linkError } = await supabaseAdmin
    .from("manager_commercial_links")
    .select("id")
    .eq("manager_id", managerId)
    .eq("commercial_id", ownerId)
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link) return null;

  return getCallWithAnalysis(callId, ownerId);
}

// Owner-or-manager write path for calls.speaker_names_override — mirrors
// getCallWithAnalysisForManager's own owner-then-manager-link check just
// above (a plain existence check is enough here, no need for the full call
// + analysis payload a read would return). Replaces the whole map rather
// than merging keys: the caller (PATCH /api/feedback/[id]/speaker-names)
// always sends the full up-to-date mapping from the client's in-memory
// state, so a partial-merge here would just be redundant.
export async function updateCallSpeakerNames(
  callId: string,
  userId: string,
  speakerNames: Record<string, string>
): Promise<void> {
  const { data: call, error: callError } = await supabaseAdmin
    .from("calls")
    .select("user_id")
    .eq("id", callId)
    .maybeSingle();
  if (callError) throw callError;
  if (!call) throw new Error("Call introuvable.");
  const ownerId = (call as { user_id: string }).user_id;

  if (ownerId !== userId) {
    const { data: link, error: linkError } = await supabaseAdmin
      .from("manager_commercial_links")
      .select("id")
      .eq("manager_id", userId)
      .eq("commercial_id", ownerId)
      .maybeSingle();
    if (linkError) throw linkError;
    if (!link) throw new Error("Accès refusé à ce call.");
  }

  const { error } = await supabaseAdmin
    .from("calls")
    .update({ speaker_names_override: speakerNames })
    .eq("id", callId);
  if (error) throw error;
}

export type CallHistoryItem = {
  id: string;
  date: string;
  global_score: number | null;
  sentiment: string | null;
  follow_up_sent_at: string | null;
};

export async function getRecentCallsForContact(
  userId: string,
  contactEmail: string,
  limit = 5
): Promise<CallHistoryItem[]> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("id, started_at, created_at, follow_up_sent_at, call_analysis(scores, sentiment)")
    .eq("user_id", userId)
    .eq("contact_email", contactEmail)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    type Row = { scores: unknown; sentiment: string | null };
    const analysis = normalizeCallAnalysis(row.call_analysis as Row | Row[] | null);
    const scores = analysis?.scores as { global_score?: number } | null;
    return {
      id: row.id as string,
      date: ((row.started_at ?? row.created_at) as string),
      global_score: scores?.global_score ?? null,
      sentiment: analysis?.sentiment ?? null,
      follow_up_sent_at: row.follow_up_sent_at as string | null,
    };
  });
}

export async function updateCallFollowUp(
  callId: string,
  followUpEmail: { subject: string; body: string }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("calls")
    .update({ follow_up_email: followUpEmail })
    .eq("id", callId);
  if (error) throw error;
}

export async function updateFollowUpSentAt(callId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("calls")
    .update({ follow_up_sent_at: new Date().toISOString() })
    .eq("id", callId);
  if (error) throw error;
}

export async function updateGmailThreadId(callId: string, threadId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("calls")
    .update({ gmail_thread_id: threadId })
    .eq("id", callId);
  if (error) throw error;
}

export type CallReplyInfo = {
  gmail_thread_id: string | null;
  follow_up_sent_at: string | null;
  follow_up_email: { subject: string; body: string } | null;
  contact_email: string | null;
  replied_at: string | null;
  reply_message_id: string | null;
};

export async function getCallReplyInfo(callId: string, userId: string): Promise<CallReplyInfo | null> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("gmail_thread_id, follow_up_sent_at, follow_up_email, contact_email, replied_at, reply_message_id")
    .eq("id", callId)
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as CallReplyInfo;
}

export async function updateReplyInfo(callId: string, repliedAt: string, messageId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("calls")
    .update({ replied_at: repliedAt, reply_message_id: messageId })
    .eq("id", callId);
  if (error) throw error;
}

export type Contact = {
  id: string;
  user_id: string;
  email: string;
  company_name: string | null;
  total_calls: number;
  last_call_summary: string | null;
  relationship_stage: string;
  created_at: string;
  updated_at: string;
};

export async function getContact(
  userId: string,
  email: string
): Promise<Contact | null> {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data as Contact | null;
}

export async function createContact(data: {
  user_id: string;
  email: string;
  company_name: string | null;
  total_calls: number;
  last_call_summary: string | null;
  relationship_stage: string;
}): Promise<{ id: string }> {
  const { data: row, error } = await supabaseAdmin
    .from("contacts")
    .insert(data)
    .select("id")
    .single();
  if (error) throw error;
  return row as { id: string };
}

export async function updateContact(
  userId: string,
  email: string,
  patch: {
    total_calls?: number;
    last_call_summary?: string;
    company_name?: string | null;
    relationship_stage?: string;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("contacts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("email", email);
  if (error) throw error;
}

export type ContactOverviewItem = {
  contact_email: string;
  company_name: string | null;
  last_contact_at: string;
  video_call_count: number;
  emails_sent_count: number;
  replies_count: number;
};

export async function getContactsOverview(userId: string): Promise<ContactOverviewItem[]> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("contact_email, company_name, started_at, created_at, follow_up_sent_at, replied_at")
    .eq("user_id", userId)
    .not("contact_email", "is", null);
  if (error) throw error;

  const grouped = new Map<string, {
    company_name: string | null;
    dates: string[];
    emails_sent_count: number;
    replies_count: number;
  }>();

  for (const row of (data ?? []) as Array<{
    contact_email: string;
    company_name: string | null;
    started_at: string | null;
    created_at: string;
    follow_up_sent_at: string | null;
    replied_at: string | null;
  }>) {
    const email = row.contact_email;
    const date = row.started_at ?? row.created_at;
    const existing = grouped.get(email);
    if (!existing) {
      grouped.set(email, {
        company_name: row.company_name,
        dates: [date],
        emails_sent_count: row.follow_up_sent_at ? 1 : 0,
        replies_count: row.replied_at ? 1 : 0,
      });
    } else {
      existing.dates.push(date);
      if (row.follow_up_sent_at) existing.emails_sent_count++;
      if (row.replied_at) existing.replies_count++;
      // keep most recent company_name (dates are unsorted, update when this row is newer)
      if (date > existing.dates[existing.dates.length - 1]) {
        existing.company_name = row.company_name;
      }
    }
  }

  return Array.from(grouped.entries()).map(([email, g]) => {
    const sorted = [...g.dates].sort();
    return {
      contact_email: email,
      company_name: g.company_name,
      last_contact_at: sorted[sorted.length - 1],
      video_call_count: g.dates.length,
      emails_sent_count: g.emails_sent_count,
      replies_count: g.replies_count,
    };
  }).sort((a, b) => b.last_contact_at.localeCompare(a.last_contact_at));
}

export type ContactTimelineItem = {
  id: string;
  date: string;
  company_name: string | null;
  duration_seconds: number | null;
  recall_bot_id: string | null;
  follow_up_email: { subject: string; body: string } | null;
  follow_up_sent_at: string | null;
  replied_at: string | null;
  reply_message_id: string | null;
  analysis: {
    global_score: number | null;
    sentiment: string | null;
    summary: string | null;
  } | null;
};

export async function getContactTimeline(
  userId: string,
  contactEmail: string
): Promise<ContactTimelineItem[]> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select(
      "id, started_at, created_at, company_name, duration_seconds, recall_bot_id, follow_up_email, follow_up_sent_at, replied_at, reply_message_id, call_analysis(scores, sentiment, summary)"
    )
    .eq("user_id", userId)
    .eq("contact_email", contactEmail)
    .order("started_at", { ascending: true, nullsFirst: true });
  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    type Row = { scores: unknown; sentiment: string | null; summary: string | null };
    const analysis = normalizeCallAnalysis(row.call_analysis as Row | Row[] | null);
    const scores = analysis?.scores as { global_score?: number } | null;
    return {
      id: row.id as string,
      date: ((row.started_at ?? row.created_at) as string),
      company_name: row.company_name as string | null,
      duration_seconds: row.duration_seconds as number | null,
      recall_bot_id: row.recall_bot_id as string | null,
      follow_up_email: row.follow_up_email as { subject: string; body: string } | null,
      follow_up_sent_at: row.follow_up_sent_at as string | null,
      replied_at: row.replied_at as string | null,
      reply_message_id: row.reply_message_id as string | null,
      analysis: analysis
        ? {
            global_score: scores?.global_score ?? null,
            sentiment: analysis.sentiment,
            summary: analysis.summary,
          }
        : null,
    };
  });
}

export type CrmTokens = {
  access_token: string;
  refresh_token: string;
  api_domain: string | null;
};

export async function saveCrmTokens(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken: string,
  apiDomain?: string
): Promise<void> {
  const { error } = await supabaseAdmin.from("crm_connections").upsert(
    {
      user_id: userId,
      provider,
      access_token: accessToken,
      refresh_token: refreshToken,
      api_domain: apiDomain ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );
  if (error) throw error;
}

export async function getCrmTokens(
  userId: string,
  provider: string
): Promise<CrmTokens | null> {
  const { data, error } = await supabaseAdmin
    .from("crm_connections")
    .select("access_token, refresh_token, api_domain")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();
  if (error || !data) return null;
  return data as CrmTokens;
}

export async function deleteCrmTokens(userId: string, provider: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("crm_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw error;
}

export type UserDashboardStat = {
  id: string;
  email: string;
  created_at: string;
  role: UserRole | null;
  disabled_at: string | null;
  invited_at: string | null;
  // Whether this user has ever completed a Google/Microsoft login (as opposed
  // to still being a pending invitation) — derived from google_id/microsoft_id.
  sso_linked: boolean;
  briefs_count: number;
  calls_count: number;
  emails_sent_count: number;
  last_activity_at: string | null;
  recall_connected: boolean;
  crm_connected: string[];
};

export async function getAdminDashboardStats(): Promise<UserDashboardStat[]> {
  const [usersRes, briefsRes, callsRes, crmRes] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, email, created_at, role, recall_calendar_id, disabled_at, invited_at, google_id, microsoft_id")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("briefs").select("user_id, created_at"),
    supabaseAdmin.from("calls").select("user_id, created_at, follow_up_sent_at"),
    supabaseAdmin.from("crm_connections").select("user_id, provider"),
  ]);

  const users = (usersRes.data ?? []) as {
    id: string;
    email: string;
    created_at: string;
    role: UserRole | null;
    recall_calendar_id: string | null;
    disabled_at: string | null;
    invited_at: string | null;
    google_id: string | null;
    microsoft_id: string | null;
  }[];
  const briefs = (briefsRes.data ?? []) as { user_id: string; created_at: string }[];
  const calls = (callsRes.data ?? []) as { user_id: string; created_at: string; follow_up_sent_at: string | null }[];
  const crm = (crmRes.data ?? []) as { user_id: string; provider: string }[];

  return users.map((user) => {
    const userBriefs = briefs.filter((b) => b.user_id === user.id);
    const userCalls = calls.filter((c) => c.user_id === user.id);
    const allDates = [...userBriefs.map((b) => b.created_at), ...userCalls.map((c) => c.created_at)]
      .filter(Boolean)
      .sort()
      .reverse();
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      role: user.role,
      disabled_at: user.disabled_at,
      invited_at: user.invited_at,
      sso_linked: user.google_id != null || user.microsoft_id != null,
      briefs_count: userBriefs.length,
      calls_count: userCalls.length,
      emails_sent_count: userCalls.filter((c) => c.follow_up_sent_at != null).length,
      last_activity_at: allDates[0] ?? null,
      recall_connected: user.recall_calendar_id != null,
      crm_connected: crm.filter((c) => c.user_id === user.id).map((c) => c.provider),
    };
  });
}

export type UserDetailForAdmin = UserDashboardStat & { name: string | null };

// Same shape as getAdminDashboardStats' rows, but scoped to a single user at
// the query level (not fetched-then-filtered) — fit for a per-user admin page.
export async function getUserDetailForAdmin(userId: string): Promise<UserDetailForAdmin | null> {
  const { data: userData, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, email, name, created_at, role, recall_calendar_id, disabled_at, invited_at, google_id, microsoft_id")
    .eq("id", userId)
    .maybeSingle();
  if (userError) throw userError;
  if (!userData) return null;

  const user = userData as {
    id: string;
    email: string;
    name: string | null;
    created_at: string;
    role: UserRole | null;
    recall_calendar_id: string | null;
    disabled_at: string | null;
    invited_at: string | null;
    google_id: string | null;
    microsoft_id: string | null;
  };

  const [briefsRes, callsRes, crmRes] = await Promise.all([
    supabaseAdmin.from("briefs").select("created_at").eq("user_id", userId),
    supabaseAdmin.from("calls").select("created_at, follow_up_sent_at").eq("user_id", userId),
    supabaseAdmin.from("crm_connections").select("provider").eq("user_id", userId),
  ]);
  if (briefsRes.error) throw briefsRes.error;
  if (callsRes.error) throw callsRes.error;
  if (crmRes.error) throw crmRes.error;

  const briefs = (briefsRes.data ?? []) as { created_at: string }[];
  const calls = (callsRes.data ?? []) as { created_at: string; follow_up_sent_at: string | null }[];
  const crm = (crmRes.data ?? []) as { provider: string }[];

  const allDates = [...briefs.map((b) => b.created_at), ...calls.map((c) => c.created_at)]
    .filter(Boolean)
    .sort()
    .reverse();

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
    role: user.role,
    disabled_at: user.disabled_at,
    invited_at: user.invited_at,
    sso_linked: user.google_id != null || user.microsoft_id != null,
    briefs_count: briefs.length,
    calls_count: calls.length,
    emails_sent_count: calls.filter((c) => c.follow_up_sent_at != null).length,
    last_activity_at: allDates[0] ?? null,
    recall_connected: user.recall_calendar_id != null,
    crm_connected: crm.map((c) => c.provider),
  };
}

export type UserRole = "commercial" | "manager";

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { role: UserRole | null } | null)?.role ?? null;
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", userId);
  if (error) throw error;
}

export async function createInvitedUser(params: {
  email: string;
  name: string | null;
  role: UserRole;
  organizationId: string;
  invitedBy: string | null;
}): Promise<string> {
  const { email, name, role, organizationId, invitedBy } = params;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    throw new Error(`Un utilisateur avec l'email ${email} existe déjà.`);
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      email,
      name,
      role,
      organization_id: organizationId,
      invited_at: new Date().toISOString(),
      invited_by: invitedBy,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export type UserForInvitation = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole | null;
  organization_id: string | null;
  invited_by: string | null;
};

export async function getUserForInvitation(userId: string): Promise<UserForInvitation | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, name, role, organization_id, invited_by")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as UserForInvitation | null;
}

export async function softDeleteUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function restoreUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ disabled_at: null })
    .eq("id", userId);
  if (error) throw error;
}

export type Organization = {
  id: string;
  name: string;
  created_at: string;
};

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("id, name, created_at")
    .eq("id", orgId)
    .maybeSingle();
  if (error) throw error;
  return data as Organization | null;
}

export async function listOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("id, name, created_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Organization[];
}

export async function createOrganization(name: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updateOrganizationName(orgId: string, name: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("organizations")
    .update({ name })
    .eq("id", orgId);
  if (error) throw error;
}

export async function deleteOrganization(orgId: string): Promise<void> {
  const { count, error: countError } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("Impossible de supprimer une organisation contenant des membres. Retirez d'abord tous les membres.");
  }

  const { error } = await supabaseAdmin.from("organizations").delete().eq("id", orgId);
  if (error) throw error;
}

export async function setUserOrganization(userId: string, orgId: string | null): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({ organization_id: orgId })
    .eq("id", userId);
  if (error) throw error;
}

export type OrganizationMember = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole | null;
  // Number of manager_commercial_links rows this user appears in under their
  // current role (as manager_id if role='manager', as commercial_id if
  // role='commercial') — lets the admin UI warn before a role change wipes them.
  links_count: number;
};

export async function getUsersInOrganization(orgId: string): Promise<OrganizationMember[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role")
    .eq("organization_id", orgId);
  if (error) throw error;

  const users = (data ?? []) as { id: string; name: string | null; email: string; role: UserRole | null }[];
  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);
  const [managerLinksRes, commercialLinksRes] = await Promise.all([
    supabaseAdmin.from("manager_commercial_links").select("manager_id").in("manager_id", userIds),
    supabaseAdmin.from("manager_commercial_links").select("commercial_id").in("commercial_id", userIds),
  ]);
  if (managerLinksRes.error) throw managerLinksRes.error;
  if (commercialLinksRes.error) throw commercialLinksRes.error;

  const managerCounts = new Map<string, number>();
  for (const row of (managerLinksRes.data ?? []) as { manager_id: string }[]) {
    managerCounts.set(row.manager_id, (managerCounts.get(row.manager_id) ?? 0) + 1);
  }
  const commercialCounts = new Map<string, number>();
  for (const row of (commercialLinksRes.data ?? []) as { commercial_id: string }[]) {
    commercialCounts.set(row.commercial_id, (commercialCounts.get(row.commercial_id) ?? 0) + 1);
  }

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    links_count:
      u.role === "manager"
        ? managerCounts.get(u.id) ?? 0
        : u.role === "commercial"
        ? commercialCounts.get(u.id) ?? 0
        : 0,
  }));
}

export async function getUserOrganizationId(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { organization_id: string | null } | null)?.organization_id ?? null;
}

export async function getOrganizationForUser(userId: string): Promise<Organization | null> {
  const orgId = await getUserOrganizationId(userId);
  if (!orgId) return null;
  return getOrganization(orgId);
}

export type OrganizationWithCounts = Organization & {
  managers_count: number;
  commercials_count: number;
  total_count: number;
};

// One query for orgs + one query for all org-assigned users, aggregated in JS —
// avoids an N+1 (one count query per org) for the admin organizations list.
export async function listOrganizationsWithCounts(): Promise<OrganizationWithCounts[]> {
  const [orgsRes, usersRes] = await Promise.all([
    supabaseAdmin.from("organizations").select("id, name, created_at").order("name", { ascending: true }),
    supabaseAdmin.from("users").select("organization_id, role").not("organization_id", "is", null),
  ]);
  if (orgsRes.error) throw orgsRes.error;
  if (usersRes.error) throw usersRes.error;

  const orgs = (orgsRes.data ?? []) as Organization[];
  const users = (usersRes.data ?? []) as { organization_id: string; role: UserRole | null }[];

  return orgs.map((org) => {
    const members = users.filter((u) => u.organization_id === org.id);
    return {
      ...org,
      managers_count: members.filter((m) => m.role === "manager").length,
      commercials_count: members.filter((m) => m.role === "commercial").length,
      total_count: members.length,
    };
  });
}

// links_count is always 0 here: a user without an org shouldn't have any
// manager_commercial_links left (removeAllLinksForUser runs when a user
// leaves an org), and this listing doesn't need the count anyway.
export async function getUsersWithoutOrganization(): Promise<OrganizationMember[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role")
    .is("organization_id", null);
  if (error) throw error;
  return ((data ?? []) as { id: string; name: string | null; email: string; role: UserRole | null }[]).map((u) => ({
    ...u,
    links_count: 0,
  }));
}

// Deletes every manager_commercial_links row involving this user, whichever
// side they're on. Call this whenever a user leaves an organization (or moves
// to a different one) — otherwise links can end up spanning two orgs.
export async function removeAllLinksForUser(userId: string): Promise<void> {
  const { error: asManagerError } = await supabaseAdmin
    .from("manager_commercial_links")
    .delete()
    .eq("manager_id", userId);
  if (asManagerError) throw asManagerError;

  const { error: asCommercialError } = await supabaseAdmin
    .from("manager_commercial_links")
    .delete()
    .eq("commercial_id", userId);
  if (asCommercialError) throw asCommercialError;
}

// Explicit cleanup of every table referencing users.id before the row itself
// is deleted. Not relying on DB-level ON DELETE CASCADE here — it couldn't be
// verified via Supabase's REST/PostgREST API (no SQL introspection access in
// this environment), so this guarantees a clean delete regardless of what the
// actual FK constraints turn out to be.
export async function hardDeleteUser(userId: string): Promise<void> {
  const { data: userCalls, error: userCallsError } = await supabaseAdmin
    .from("calls")
    .select("id")
    .eq("user_id", userId);
  if (userCallsError) throw userCallsError;

  const callIds = ((userCalls ?? []) as { id: string }[]).map((c) => c.id);
  if (callIds.length > 0) {
    const { error: callAnalysisError } = await supabaseAdmin
      .from("call_analysis")
      .delete()
      .in("call_id", callIds);
    if (callAnalysisError) throw callAnalysisError;
  }

  const { error: callsError } = await supabaseAdmin.from("calls").delete().eq("user_id", userId);
  if (callsError) throw callsError;

  const { error: briefsError } = await supabaseAdmin.from("briefs").delete().eq("user_id", userId);
  if (briefsError) throw briefsError;

  const { error: contactsError } = await supabaseAdmin.from("contacts").delete().eq("user_id", userId);
  if (contactsError) throw contactsError;

  const { error: crmError } = await supabaseAdmin.from("crm_connections").delete().eq("user_id", userId);
  if (crmError) throw crmError;

  const { error: profileError } = await supabaseAdmin.from("user_profiles").delete().eq("user_id", userId);
  if (profileError) throw profileError;

  const { error: referencesError } = await supabaseAdmin.from("client_references").delete().eq("user_id", userId);
  if (referencesError) throw referencesError;

  const { error: importJobsError } = await supabaseAdmin.from("import_jobs").delete().eq("user_id", userId);
  if (importJobsError) throw importJobsError;

  const { error: scheduledMeetingsError } = await supabaseAdmin.from("scheduled_meetings").delete().eq("user_id", userId);
  if (scheduledMeetingsError) throw scheduledMeetingsError;

  await removeAllLinksForUser(userId);

  // Other users this one invited keep their row — just drop the now-dangling reference.
  const { error: invitedByError } = await supabaseAdmin
    .from("users")
    .update({ invited_by: null })
    .eq("invited_by", userId);
  if (invitedByError) throw invitedByError;

  const { error: deleteError } = await supabaseAdmin.from("users").delete().eq("id", userId);
  if (deleteError) throw deleteError;
}

export type LinkedUser = {
  id: string;
  name: string | null;
  email: string;
};

// A manager only ever sees commercials sharing their organization — if the
// manager isn't in an org yet, there's nothing valid to return.
export async function getCommercialsForManager(managerId: string): Promise<LinkedUser[]> {
  const managerOrgId = await getUserOrganizationId(managerId);
  if (!managerOrgId) return [];

  const { data: links, error: linksError } = await supabaseAdmin
    .from("manager_commercial_links")
    .select("commercial_id")
    .eq("manager_id", managerId);
  if (linksError) throw linksError;

  const commercialIds = (links ?? []).map((l) => (l as { commercial_id: string }).commercial_id);
  if (commercialIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", commercialIds)
    .eq("organization_id", managerOrgId);
  if (error) throw error;
  return (data ?? []) as LinkedUser[];
}

// Symmetric to getCommercialsForManager — same-organization constraint.
export async function getManagersForCommercial(commercialId: string): Promise<LinkedUser[]> {
  const commercialOrgId = await getUserOrganizationId(commercialId);
  if (!commercialOrgId) return [];

  const { data: links, error: linksError } = await supabaseAdmin
    .from("manager_commercial_links")
    .select("manager_id")
    .eq("commercial_id", commercialId);
  if (linksError) throw linksError;

  const managerIds = (links ?? []).map((l) => (l as { manager_id: string }).manager_id);
  if (managerIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", managerIds)
    .eq("organization_id", commercialOrgId);
  if (error) throw error;
  return (data ?? []) as LinkedUser[];
}

export type OrganizationCommercial = {
  id: string;
  name: string | null;
  email: string;
  is_linked: boolean;
};

// All commercials in the manager's own organization, each flagged with
// whether they're currently linked to this manager — feeds the "manage my
// team" picker so a manager can link/unlink without knowing IDs upfront.
export async function getOrganizationCommercialsForManager(
  managerId: string
): Promise<OrganizationCommercial[]> {
  const managerOrgId = await getUserOrganizationId(managerId);
  if (!managerOrgId) return [];

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .eq("organization_id", managerOrgId)
    .eq("role", "commercial");
  if (error) throw error;

  const commercials = (data ?? []) as { id: string; name: string | null; email: string }[];
  if (commercials.length === 0) return [];

  const { data: links, error: linksError } = await supabaseAdmin
    .from("manager_commercial_links")
    .select("commercial_id")
    .eq("manager_id", managerId);
  if (linksError) throw linksError;

  const linkedIds = new Set((links ?? []).map((l) => (l as { commercial_id: string }).commercial_id));

  return commercials.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    is_linked: linkedIds.has(c.id),
  }));
}

export async function linkManagerToCommercial(managerId: string, commercialId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, role, organization_id")
    .in("id", [managerId, commercialId]);
  if (error) throw error;

  const users = (data ?? []) as { id: string; role: UserRole | null; organization_id: string | null }[];
  const manager = users.find((u) => u.id === managerId);
  const commercial = users.find((u) => u.id === commercialId);

  if (!manager) throw new Error(`linkManagerToCommercial: utilisateur manager ${managerId} introuvable.`);
  if (!commercial) throw new Error(`linkManagerToCommercial: utilisateur commercial ${commercialId} introuvable.`);
  if (manager.role !== "manager") {
    throw new Error(`linkManagerToCommercial: l'utilisateur ${managerId} n'a pas le rôle 'manager'.`);
  }
  if (commercial.role !== "commercial") {
    throw new Error(`linkManagerToCommercial: l'utilisateur ${commercialId} n'a pas le rôle 'commercial'.`);
  }
  if (!manager.organization_id || !commercial.organization_id) {
    throw new Error("linkManagerToCommercial: le manager et le commercial doivent tous les deux appartenir à une organisation.");
  }
  if (manager.organization_id !== commercial.organization_id) {
    throw new Error("linkManagerToCommercial: le manager et le commercial doivent appartenir à la même organisation.");
  }

  const { error: upsertError } = await supabaseAdmin
    .from("manager_commercial_links")
    .upsert(
      { manager_id: managerId, commercial_id: commercialId },
      { onConflict: "manager_id,commercial_id", ignoreDuplicates: true }
    );
  if (upsertError) throw upsertError;
}

export async function unlinkManagerFromCommercial(managerId: string, commercialId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("manager_commercial_links")
    .delete()
    .eq("manager_id", managerId)
    .eq("commercial_id", commercialId);
  if (error) throw error;
}

export type TeamOverviewItem = {
  user_id: string;
  name: string | null;
  email: string;
  briefs_count: number;
  calls_count: number;
  emails_sent_count: number;
  avg_score: number | null;
  last_activity_at: string | null;
};

export async function getTeamOverview(managerId: string): Promise<TeamOverviewItem[]> {
  const commercials = await getCommercialsForManager(managerId);
  if (commercials.length === 0) return [];
  const commercialIds = commercials.map((c) => c.id);

  const [briefsRes, callsRes] = await Promise.all([
    supabaseAdmin.from("briefs").select("user_id, created_at").in("user_id", commercialIds),
    supabaseAdmin
      .from("calls")
      .select("user_id, created_at, follow_up_sent_at, call_analysis(scores)")
      .in("user_id", commercialIds),
  ]);
  if (briefsRes.error) throw briefsRes.error;
  if (callsRes.error) throw callsRes.error;

  const briefs = (briefsRes.data ?? []) as { user_id: string; created_at: string }[];
  const calls = (callsRes.data ?? []) as Array<{
    user_id: string;
    created_at: string;
    follow_up_sent_at: string | null;
    call_analysis: { scores: AnalysisScores | null } | { scores: AnalysisScores | null }[] | null;
  }>;

  return commercials.map((c) => {
    const userBriefs = briefs.filter((b) => b.user_id === c.id);
    const userCalls = calls.filter((call) => call.user_id === c.id);
    const globalScores = userCalls
      .map((call) => normalizeCallAnalysis(call.call_analysis)?.scores?.global_score)
      .filter((s): s is number => typeof s === "number");
    const avgScore = globalScores.length > 0
      ? globalScores.reduce((a, b) => a + b, 0) / globalScores.length
      : null;
    const allDates = [...userBriefs.map((b) => b.created_at), ...userCalls.map((call) => call.created_at)]
      .filter(Boolean)
      .sort()
      .reverse();

    return {
      user_id: c.id,
      name: c.name,
      email: c.email,
      briefs_count: userBriefs.length,
      calls_count: userCalls.length,
      emails_sent_count: userCalls.filter((call) => call.follow_up_sent_at != null).length,
      avg_score: avgScore,
      last_activity_at: allDates[0] ?? null,
    };
  });
}

export type TeamAverageScoreDimension = {
  key: string;
  label: string;
  weight: number;
  average: number | null;
};

export type TeamAverageScores = {
  global_score: number | null;
  calls_analyzed_count: number;
  dimensions: TeamAverageScoreDimension[];
};

// Dimensions shown are always the manager's ORG's CURRENT playbook (product
// choice, sous-étape D) — fetched once here, not per-analysis — so the
// bandeau stays consistent with what /team/playbook shows today, even
// though individual analyses may have been scored against an older/different
// playbook_snapshot. A dimension average is computed over whichever analyses
// happen to have a matching key in their `scores`; older analyses that don't
// (different dimension keys) are simply excluded from that dimension's
// average rather than counted as missing/zero.
export async function getTeamAverageScores(managerId: string): Promise<TeamAverageScores> {
  const snapshot = await getPlaybookSnapshotForUser(managerId);
  const empty: TeamAverageScores = {
    global_score: null,
    calls_analyzed_count: 0,
    dimensions: snapshot.dimensions.map((d) => ({ key: d.key, label: d.label, weight: d.weight, average: null })),
  };

  const commercials = await getCommercialsForManager(managerId);
  if (commercials.length === 0) return empty;
  const commercialIds = commercials.map((c) => c.id);

  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("call_analysis(scores)")
    .in("user_id", commercialIds);
  if (error) throw error;

  const allScores = (
    (data ?? []) as Array<{ call_analysis: { scores: AnalysisScores | null } | { scores: AnalysisScores | null }[] | null }>
  )
    .map((row) => normalizeCallAnalysis(row.call_analysis)?.scores)
    .filter((s): s is AnalysisScores => s != null);

  if (allScores.length === 0) return empty;

  const avg = (values: number[]): number | null =>
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

  return {
    global_score: avg(allScores.map((s) => s.global_score)),
    calls_analyzed_count: allScores.length,
    dimensions: snapshot.dimensions.map((d) => {
      const scoresForDimension = allScores
        .map((s) => s[d.key])
        .filter((v): v is AnalysisDimensionScore => typeof v === "object" && v !== null)
        .map((v) => v.score);
      return { key: d.key, label: d.label, weight: d.weight, average: avg(scoresForDimension) };
    }),
  };
}

export type CommercialDetailForManager = {
  user_id: string;
  name: string | null;
  email: string;
  calls: CallWithAnalysis[];
  briefs: Awaited<ReturnType<typeof getBriefsByUser>>;
  trend: {
    recent_avg_score: number | null;
    previous_avg_score: number | null;
  } | null;
};

export async function getCommercialDetailForManager(
  managerId: string,
  commercialId: string
): Promise<CommercialDetailForManager | null> {
  const { data: link, error: linkError } = await supabaseAdmin
    .from("manager_commercial_links")
    .select("id")
    .eq("manager_id", managerId)
    .eq("commercial_id", commercialId)
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link) return null;

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .eq("id", commercialId)
    .maybeSingle();
  if (userError) throw userError;
  if (!user) return null;

  const [calls, briefs] = await Promise.all([
    getCallsWithAnalysis(commercialId),
    getBriefsByUser(commercialId),
  ]);

  // getCallsWithAnalysis orders most-recent-first, so the first 5/next 5 map directly to recent/previous
  const recentGlobalScores = calls
    .slice(0, 5)
    .map((c) => c.analysis?.scores?.global_score)
    .filter((s): s is number => typeof s === "number");
  const previousGlobalScores = calls
    .slice(5, 10)
    .map((c) => c.analysis?.scores?.global_score)
    .filter((s): s is number => typeof s === "number");

  const avg = (values: number[]): number | null =>
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

  const trend =
    recentGlobalScores.length > 0
      ? {
          recent_avg_score: avg(recentGlobalScores),
          previous_avg_score: previousGlobalScores.length > 0 ? avg(previousGlobalScores) : null,
        }
      : null;

  return {
    user_id: (user as { id: string }).id,
    name: (user as { name: string | null }).name,
    email: (user as { email: string }).email,
    calls,
    briefs,
    trend,
  };
}

// playbookSnapshot is a frozen copy of the org playbook's dimensions at
// analysis time (sous-étape B) — null for pre-playbook analyses and for
// direct callers that don't pass one, which is fine: getEffectiveScoresForDisplay
// falls back to the 4 historical labels when it's absent. analysis.scores is
// already keyed by whatever dimension keys Claude was asked to score (see
// analyzeCall / PlaybookSnapshot), so it's persisted as-is.
// Returns the row's id — used by the bot-webhook to immediately generate
// key_points for the same analysis (module Distribution Flexible, sous-étape
// B) without a separate lookup query.
export async function saveCallAnalysis(
  callId: string,
  analysis: import("./call-analysis").CallAnalysis,
  playbookSnapshot: PlaybookSnapshot | null = null
): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from("call_analysis")
    .upsert(
      {
        call_id: callId,
        strengths: analysis.strong_points,
        weaknesses: analysis.weak_points,
        objections: [],
        next_steps: analysis.next_steps,
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        scores: analysis.scores,
        playbook_snapshot: playbookSnapshot,
      },
      { onConflict: "call_id" }
    )
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

// Caches the on-demand key-points generation (lib/key-points.ts) — the
// route calling this has already proven access to the call (owner or linked
// manager, same check as /feedback/[id]/page.tsx) before ever reaching here,
// so this only needs the analysisId+callId pair filter as a sanity check
// against updating the wrong row, not a full ownership re-check.
export async function updateCallAnalysisKeyPoints(
  analysisId: string,
  callId: string,
  keyPoints: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("call_analysis")
    .update({ key_points: keyPoints, key_points_generated_at: new Date().toISOString() })
    .eq("id", analysisId)
    .eq("call_id", callId);
  if (error) throw error;
}

export type ScheduledMeetingUpsert = {
  calendar_event_id: string;
  event_title: string;
  event_start_at: string | null;
  bot_scheduled: boolean;
  ineligibility_reason: string | null;
};

// Bulk upsert of one user's Recall calendar-events snapshot, called from the
// syncRecallCalendars cron (lib/recall.ts) right after it fetches events for
// its own bot-scheduling pass — no extra Recall API call here.
export async function upsertScheduledMeetings(
  userId: string,
  meetings: ScheduledMeetingUpsert[]
): Promise<void> {
  if (meetings.length === 0) return;
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin.from("scheduled_meetings").upsert(
    meetings.map((m) => ({
      user_id: userId,
      calendar_event_id: m.calendar_event_id,
      event_title: m.event_title,
      event_start_at: m.event_start_at,
      bot_scheduled: m.bot_scheduled,
      ineligibility_reason: m.ineligibility_reason,
      last_synced_at: now,
    })),
    { onConflict: "user_id,calendar_event_id" }
  );
  if (error) throw error;
}

// Deletes rows that are no longer relevant. bot_scheduled=true rows are kept
// for the full 7-day window getMissedScheduledMeetings needs (regardless of
// whether Recall still lists them as upcoming — pruning them as soon as they
// leave the active list, like ineligible rows, would empty the table before
// no-show detection ever had a chance to run). Ineligible rows have no
// historical value and keep the previous fast-cleanup behavior.
export async function pruneScheduledMeetings(
  userId: string,
  activeCalendarEventIds: string[]
): Promise<void> {
  const shortCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const longCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .select("id, calendar_event_id, event_start_at, bot_scheduled")
    .eq("user_id", userId);
  if (error) throw error;

  const activeSet = new Set(activeCalendarEventIds);
  const staleIds = (
    (data ?? []) as {
      id: string;
      calendar_event_id: string;
      event_start_at: string | null;
      bot_scheduled: boolean;
    }[]
  )
    .filter((row) => {
      if (row.bot_scheduled) {
        return row.event_start_at !== null && row.event_start_at < longCutoff;
      }
      return (row.event_start_at !== null && row.event_start_at < shortCutoff) || !activeSet.has(row.calendar_event_id);
    })
    .map((row) => row.id);
  if (staleIds.length === 0) return;

  const { error: deleteError } = await supabaseAdmin
    .from("scheduled_meetings")
    .delete()
    .in("id", staleIds);
  if (deleteError) throw deleteError;
}

export type UpcomingScheduledMeeting = {
  id: string;
  user_email: string;
  user_name: string | null;
  event_title: string;
  event_start_at: string | null;
  bot_scheduled: boolean;
  ineligibility_reason: string | null;
};

async function fetchUpcomingScheduledMeetings(
  limit: number,
  userId?: string
): Promise<UpcomingScheduledMeeting[]> {
  const now = new Date().toISOString();

  let query = supabaseAdmin
    .from("scheduled_meetings")
    .select("id, user_id, event_title, event_start_at, bot_scheduled, ineligibility_reason")
    .gte("event_start_at", now)
    .eq("bot_scheduled", true)
    .order("event_start_at", { ascending: true })
    .limit(limit);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as {
    id: string;
    user_id: string;
    event_title: string;
    event_start_at: string | null;
    bot_scheduled: boolean;
    ineligibility_reason: string | null;
  }[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: usersData, error: usersError } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", userIds);
  if (usersError) throw usersError;

  const userById = new Map(
    ((usersData ?? []) as { id: string; name: string | null; email: string }[]).map((u) => [u.id, u])
  );

  return rows.map((r) => ({
    id: r.id,
    user_email: userById.get(r.user_id)?.email ?? "",
    user_name: userById.get(r.user_id)?.name ?? null,
    event_title: r.event_title,
    event_start_at: r.event_start_at,
    bot_scheduled: r.bot_scheduled,
    ineligibility_reason: r.ineligibility_reason,
  }));
}

// Reads the scheduled_meetings snapshot maintained by the cron — 0 Recall API calls.
export async function getUpcomingScheduledMeetings(limit = 100): Promise<UpcomingScheduledMeeting[]> {
  return fetchUpcomingScheduledMeetings(limit);
}

export async function getUpcomingScheduledMeetingsForUser(
  userId: string,
  limit = 100
): Promise<UpcomingScheduledMeeting[]> {
  return fetchUpcomingScheduledMeetings(limit, userId);
}

type SuspiciousRecentCall = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  company_name: string | null;
  contact_email: string | null;
  recall_bot_id: string;
  created_at: string;
  recall_bot_status: string | null;
  recall_bot_status_fetched_at: string | null;
};

// Pure DB query, no Recall API call — flags calls from the last 7 days where a
// bot was scheduled (recall_bot_id set) but no recording ever came back
// (recording_id null), a likely sign of a rejected or failed bot.
async function fetchSuspiciousRecentCalls(limit: number, userId?: string): Promise<SuspiciousRecentCall[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from("calls")
    .select("id, user_id, company_name, contact_email, recall_bot_id, created_at, recall_bot_status, recall_bot_status_fetched_at")
    .gte("created_at", sevenDaysAgo)
    .not("recall_bot_id", "is", null)
    .is("recording_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw error;

  const calls = (data ?? []) as {
    id: string;
    user_id: string;
    company_name: string | null;
    contact_email: string | null;
    recall_bot_id: string;
    created_at: string;
    recall_bot_status: string | null;
    recall_bot_status_fetched_at: string | null;
  }[];
  if (calls.length === 0) return [];

  const userIds = [...new Set(calls.map((c) => c.user_id))];
  const { data: usersData, error: usersError } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", userIds);
  if (usersError) throw usersError;

  const userById = new Map(
    ((usersData ?? []) as { id: string; name: string | null; email: string }[]).map((u) => [u.id, u])
  );

  return calls.map((c) => ({
    id: c.id,
    user_id: c.user_id,
    user_email: userById.get(c.user_id)?.email ?? "",
    user_name: userById.get(c.user_id)?.name ?? null,
    company_name: c.company_name,
    contact_email: c.contact_email,
    recall_bot_id: c.recall_bot_id,
    created_at: c.created_at,
    recall_bot_status: c.recall_bot_status,
    recall_bot_status_fetched_at: c.recall_bot_status_fetched_at,
  }));
}

export async function updateCallRecallBotStatus(callId: string, status: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("calls")
    .update({ recall_bot_status: status, recall_bot_status_fetched_at: new Date().toISOString() })
    .eq("id", callId);
  if (error) throw error;
}

export type MissedScheduledMeeting = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  event_title: string;
  event_start_at: string;
  calendar_event_id: string;
  recall_bot_id: string | null;
  recall_bot_status: string | null;
  recall_bot_status_fetched_at: string | null;
};

const MISSED_MEETING_GRACE_MS = 30 * 60 * 1000;
const MISSED_MEETING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MISSED_MEETING_MATCH_BUFFER_MS = 3 * 60 * 60 * 1000;

// Pure DB query, no Recall API call — a scheduled_meetings row only ever
// tells us a bot *was* scheduled, never whether it actually recorded
// anything (calls rows only exist once transcript.done fires, so a rejected
// bot / no-show never produces one). We flag a meeting as "missed" when it's
// well past its start time and no calls row for the same user shows up
// anywhere near that time — there's no scheduled_meeting_id on calls to join
// on directly, so proximity in time on the same user is the best available
// signal.
export async function getMissedScheduledMeetings(
  limit = 20,
  userId: string | null = null
): Promise<MissedScheduledMeeting[]> {
  const now = Date.now();
  const recentCutoff = new Date(now - MISSED_MEETING_GRACE_MS).toISOString();
  const windowStart = new Date(now - MISSED_MEETING_WINDOW_MS).toISOString();

  let query = supabaseAdmin
    .from("scheduled_meetings")
    .select(
      "id, user_id, event_title, event_start_at, calendar_event_id, recall_bot_id, recall_bot_status, recall_bot_status_fetched_at"
    )
    .eq("bot_scheduled", true)
    .lt("event_start_at", recentCutoff)
    .gt("event_start_at", windowStart)
    .order("event_start_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;
  if (error) throw error;

  const meetings = (data ?? []) as {
    id: string;
    user_id: string;
    event_title: string;
    event_start_at: string;
    calendar_event_id: string;
    recall_bot_id: string | null;
    recall_bot_status: string | null;
    recall_bot_status_fetched_at: string | null;
  }[];
  if (meetings.length === 0) return [];

  const userIds = [...new Set(meetings.map((m) => m.user_id))];
  const callsLowerBound = new Date(now - MISSED_MEETING_WINDOW_MS - MISSED_MEETING_MATCH_BUFFER_MS).toISOString();
  const { data: callsData, error: callsError } = await supabaseAdmin
    .from("calls")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .gte("created_at", callsLowerBound);
  if (callsError) throw callsError;

  const calls = (callsData ?? []) as { user_id: string; created_at: string }[];

  const hasMatchingCall = (candidateUserId: string, eventStartAt: string): boolean => {
    const eventTime = new Date(eventStartAt).getTime();
    return calls.some(
      (c) =>
        c.user_id === candidateUserId &&
        Math.abs(new Date(c.created_at).getTime() - eventTime) <= MISSED_MEETING_MATCH_BUFFER_MS
    );
  };

  const missed = meetings.filter((m) => !hasMatchingCall(m.user_id, m.event_start_at)).slice(0, limit);
  if (missed.length === 0) return [];

  const missedUserIds = [...new Set(missed.map((m) => m.user_id))];
  const { data: usersData, error: usersError } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", missedUserIds);
  if (usersError) throw usersError;

  const userById = new Map(
    ((usersData ?? []) as { id: string; name: string | null; email: string }[]).map((u) => [u.id, u])
  );

  return missed.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    user_email: userById.get(m.user_id)?.email ?? "",
    user_name: userById.get(m.user_id)?.name ?? null,
    event_title: m.event_title,
    event_start_at: m.event_start_at,
    calendar_event_id: m.calendar_event_id,
    recall_bot_id: m.recall_bot_id,
    recall_bot_status: m.recall_bot_status,
    recall_bot_status_fetched_at: m.recall_bot_status_fetched_at,
  }));
}

export async function updateScheduledMeetingBotStatus(
  scheduledMeetingId: string,
  recallBotId: string,
  status: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("scheduled_meetings")
    .update({
      recall_bot_id: recallBotId,
      recall_bot_status: status,
      recall_bot_status_fetched_at: new Date().toISOString(),
    })
    .eq("id", scheduledMeetingId);
  if (error) throw error;
}

export type FailedRecordingSource = "call" | "meeting";

export type FailedRecording = {
  id: string; // "call:<id>" or "meeting:<id>"
  source: FailedRecordingSource;
  user_id: string;
  user_email: string;
  user_name: string | null;
  event_title: string;
  event_start_at: string;
  recall_bot_id: string | null;
  recall_bot_status: string | null;
  recall_bot_status_fetched_at: string | null;
  calendar_event_id: string | null; // null for calls
};

// Merges the two "bot scheduled but no recording" sources — calls missing a
// recording, and scheduled_meetings with no matching call at all — into one
// list, sorted by date desc with a single global limit (not `limit` per
// source).
//
// A meeting can still overlap with a call here even though
// getMissedScheduledMeetings already excludes meetings matching *any* call:
// its own match window is anchored on the call's created_at, which can drift
// more than 3h from event_start_at (long meeting, delayed async transcript).
// So we re-check proximity here too, on the same ±3h/same-user basis, and
// keep the call side (it already has a known recall_bot_id).
export async function getFailedRecordingsForAdmin(
  limit = 20,
  userId?: string
): Promise<FailedRecording[]> {
  const [calls, meetings] = await Promise.all([
    fetchSuspiciousRecentCalls(limit, userId),
    getMissedScheduledMeetings(limit, userId ?? null),
  ]);

  const callEntries: FailedRecording[] = calls.map((c) => ({
    id: `call:${c.id}`,
    source: "call" as const,
    user_id: c.user_id,
    user_email: c.user_email,
    user_name: c.user_name,
    event_title: c.company_name || c.contact_email || "Contact inconnu",
    event_start_at: c.created_at,
    recall_bot_id: c.recall_bot_id,
    recall_bot_status: c.recall_bot_status,
    recall_bot_status_fetched_at: c.recall_bot_status_fetched_at,
    calendar_event_id: null,
  }));

  const matchesACall = (meeting: MissedScheduledMeeting): boolean => {
    const meetingTime = new Date(meeting.event_start_at).getTime();
    return calls.some(
      (c) =>
        c.user_id === meeting.user_id &&
        Math.abs(new Date(c.created_at).getTime() - meetingTime) <= MISSED_MEETING_MATCH_BUFFER_MS
    );
  };

  const meetingEntries: FailedRecording[] = meetings
    .filter((m) => !matchesACall(m))
    .map((m) => ({
      id: `meeting:${m.id}`,
      source: "meeting" as const,
      user_id: m.user_id,
      user_email: m.user_email,
      user_name: m.user_name,
      event_title: m.event_title,
      event_start_at: m.event_start_at,
      recall_bot_id: m.recall_bot_id,
      recall_bot_status: m.recall_bot_status,
      recall_bot_status_fetched_at: m.recall_bot_status_fetched_at,
      calendar_event_id: m.calendar_event_id,
    }));

  return [...callEntries, ...meetingEntries]
    .sort((a, b) => b.event_start_at.localeCompare(a.event_start_at))
    .slice(0, limit);
}

// ─── Quotes module — settings, offer catalog, quote numbering ────────────────

export type QuoteSettings = {
  id: string;
  user_id: string;
  company_name: string | null;
  company_siret: string | null;
  company_vat_number: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_website: string | null;
  company_logo_url: string | null;
  company_rib: string | null;
  legal_mentions: string | null;
  default_vat_rate: number;
  payment_terms: string | null;
  quote_number_prefix: string;
  next_quote_number: number;
  created_at: string;
  updated_at: string;
};

export async function getQuoteSettings(userId: string): Promise<QuoteSettings | null> {
  const { data, error } = await supabaseAdmin
    .from("quote_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as QuoteSettings | null;
}

export type QuoteSettingsInput = Partial<
  Omit<QuoteSettings, "id" | "user_id" | "created_at" | "updated_at" | "next_quote_number">
>;

export async function upsertQuoteSettings(userId: string, data: QuoteSettingsInput): Promise<void> {
  const { error } = await supabaseAdmin
    .from("quote_settings")
    .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

export type QuoteOffer = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit: string;
  vat_rate: number;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listQuoteOffers(userId: string): Promise<QuoteOffer[]> {
  const { data, error } = await supabaseAdmin
    .from("quote_offers")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as QuoteOffer[];
}

export type QuoteOfferInput = {
  name: string;
  description?: string | null;
  unit_price: number;
  unit?: string;
  vat_rate?: number;
  sort_order?: number;
};

export async function createQuoteOffer(userId: string, data: QuoteOfferInput): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from("quote_offers")
    .insert({ user_id: userId, ...data })
    .select("id")
    .single();
  if (error) throw error;
  return (row as { id: string }).id;
}

export async function updateQuoteOffer(
  offerId: string,
  userId: string,
  data: Partial<QuoteOfferInput>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("quote_offers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function archiveQuoteOffer(offerId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("quote_offers")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("user_id", userId);
  if (error) throw error;
}

// Atomic increment-and-read via a Postgres function (see summary for the SQL
// to create it) — a plain select-then-update from JS would race under
// concurrent requests for the same user. Reused as-is in sous-étape C.
export async function getNextQuoteNumber(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("increment_quote_number", { p_user_id: userId });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as { number: number; prefix: string } | null;
  if (!row) {
    throw new Error(
      "Aucun paramètre de devis trouvé pour cet utilisateur — configurez d'abord les paramètres devis."
    );
  }

  const year = new Date().getFullYear();
  return `${row.prefix}-${year}-${String(row.number).padStart(4, "0")}`;
}

// ─── Quotes module — quotes + lines (sous-étape B) ────────────────────────────

export async function listContactsForUser(userId: string): Promise<Contact[]> {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contact[];
}

export type QuoteLine = {
  id: string;
  quote_id: string;
  offer_id: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  vat_rate: number;
  discount_type: "percent" | "amount" | null;
  discount_value: number;
  sort_order: number;
  created_at: string;
};

export type Quote = {
  id: string;
  user_id: string;
  contact_id: string | null;
  quote_number: string;
  status: string;
  company_snapshot: Record<string, unknown>;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  client_siret: string | null;
  client_vat_number: string | null;
  notes: string | null;
  legal_mentions: string | null;
  payment_terms: string | null;
  subtotal_ht: number;
  total_discount: number;
  total_vat: number;
  total_ttc: number;
  issued_at: string;
  valid_until: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  public_token: string | null;
  rejection_reason: string | null;
  acceptance_notified: boolean;
  sent_email_subject: string | null;
  sent_email_body: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteListItem = {
  id: string;
  quote_number: string;
  status: string;
  client_name: string;
  client_email: string | null;
  total_ttc: number;
  issued_at: string;
  created_at: string;
  viewed_at: string | null;
};

// client_name/client_email are already denormalized onto quotes itself (the
// snapshot pattern), so no join to contacts is needed to display them.
export async function listQuotesForUser(userId: string): Promise<QuoteListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("id, quote_number, status, client_name, client_email, total_ttc, issued_at, created_at, viewed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as QuoteListItem[];
}

export type QuoteWithLines = Quote & { lines: QuoteLine[] };

export async function getQuoteWithLines(quoteId: string, userId: string): Promise<QuoteWithLines | null> {
  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!quote) return null;

  const { data: lines, error: linesError } = await supabaseAdmin
    .from("quote_lines")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (linesError) throw linesError;

  return { ...(quote as Quote), lines: (lines ?? []) as QuoteLine[] };
}

export type QuoteLineInput = {
  offer_id?: string | null;
  name: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  vat_rate: number;
  discount_type?: "percent" | "amount" | null;
  discount_value?: number | null;
  sort_order?: number;
};

export type QuoteDataInput = {
  contact_id?: string | null;
  client_name: string;
  client_email?: string | null;
  client_address?: string | null;
  client_siret?: string | null;
  client_vat_number?: string | null;
  notes?: string | null;
  legal_mentions?: string | null;
  payment_terms?: string | null;
  valid_until?: string | null;
  lines: QuoteLineInput[];
};

function quoteLineRows(quoteId: string, lines: QuoteLineInput[]) {
  return lines.map((line, i) => ({
    quote_id: quoteId,
    offer_id: line.offer_id ?? null,
    name: line.name,
    description: line.description ?? null,
    quantity: line.quantity,
    unit: line.unit ?? null,
    unit_price: line.unit_price,
    vat_rate: line.vat_rate,
    discount_type: line.discount_type ?? null,
    discount_value: line.discount_value ?? 0,
    sort_order: line.sort_order ?? i,
  }));
}

// Drafts only — snapshots quote_settings (so later edits to the company
// profile never retroactively change an already-created quote), and mints
// the quote_number via the atomic Postgres function.
export async function createQuote(userId: string, data: QuoteDataInput): Promise<string> {
  const settings = await getQuoteSettings(userId);
  if (!settings) {
    throw new Error("Configurez d'abord vos paramètres devis avant de créer un devis.");
  }

  const quoteNumber = await getNextQuoteNumber(userId);
  const totals = computeQuoteTotals(data.lines);

  const companySnapshot = {
    company_name: settings.company_name,
    company_siret: settings.company_siret,
    company_vat_number: settings.company_vat_number,
    company_address: settings.company_address,
    company_email: settings.company_email,
    company_phone: settings.company_phone,
    company_website: settings.company_website,
    company_logo_url: settings.company_logo_url,
    company_rib: settings.company_rib,
  };

  const { data: row, error } = await supabaseAdmin
    .from("quotes")
    .insert({
      user_id: userId,
      contact_id: data.contact_id ?? null,
      quote_number: quoteNumber,
      status: "draft",
      company_snapshot: companySnapshot,
      client_name: data.client_name,
      client_email: data.client_email ?? null,
      client_address: data.client_address ?? null,
      client_siret: data.client_siret ?? null,
      client_vat_number: data.client_vat_number ?? null,
      notes: data.notes ?? null,
      legal_mentions: data.legal_mentions ?? settings.legal_mentions,
      payment_terms: data.payment_terms ?? settings.payment_terms,
      valid_until: data.valid_until ?? null,
      subtotal_ht: totals.subtotal_ht,
      total_discount: totals.total_discount,
      total_vat: totals.total_vat,
      total_ttc: totals.total_ttc,
    })
    .select("id")
    .single();
  if (error) throw error;

  const quoteId = (row as { id: string }).id;

  if (data.lines.length > 0) {
    const { error: linesError } = await supabaseAdmin.from("quote_lines").insert(quoteLineRows(quoteId, data.lines));
    if (linesError) throw linesError;
  }

  return quoteId;
}

export async function updateQuote(quoteId: string, userId: string, data: QuoteDataInput): Promise<void> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Devis introuvable.");
  if ((existing as { status: string }).status !== "draft") {
    throw new Error("Seuls les devis en brouillon peuvent être modifiés.");
  }

  const totals = computeQuoteTotals(data.lines);

  const { error } = await supabaseAdmin
    .from("quotes")
    .update({
      contact_id: data.contact_id ?? null,
      client_name: data.client_name,
      client_email: data.client_email ?? null,
      client_address: data.client_address ?? null,
      client_siret: data.client_siret ?? null,
      client_vat_number: data.client_vat_number ?? null,
      notes: data.notes ?? null,
      legal_mentions: data.legal_mentions ?? null,
      payment_terms: data.payment_terms ?? null,
      valid_until: data.valid_until ?? null,
      subtotal_ht: totals.subtotal_ht,
      total_discount: totals.total_discount,
      total_vat: totals.total_vat,
      total_ttc: totals.total_ttc,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);
  if (error) throw error;

  // Replace all lines wholesale — simplest correct approach for a
  // full-form editor save, avoids diffing added/removed/changed rows.
  const { error: deleteError } = await supabaseAdmin.from("quote_lines").delete().eq("quote_id", quoteId);
  if (deleteError) throw deleteError;

  if (data.lines.length > 0) {
    const { error: insertError } = await supabaseAdmin.from("quote_lines").insert(quoteLineRows(quoteId, data.lines));
    if (insertError) throw insertError;
  }
}

export async function deleteQuote(quoteId: string, userId: string): Promise<void> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) return;
  if ((existing as { status: string }).status !== "draft") {
    throw new Error("Seuls les devis en brouillon peuvent être supprimés.");
  }

  const { error: linesError } = await supabaseAdmin.from("quote_lines").delete().eq("quote_id", quoteId);
  if (linesError) throw linesError;

  const { error } = await supabaseAdmin.from("quotes").delete().eq("id", quoteId);
  if (error) throw error;
}

// ─── Quotes module — AI pre-fill context (sous-étape D) ───────────────────────

export async function getContactById(contactId: string, userId: string): Promise<Contact | null> {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Contact | null;
}

export type QuoteGenerationCallContext = {
  date: string;
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  objections: string[];
  next_steps: string[];
};

// Richer than getRecentCallsForContact/getContactTimeline (which only expose
// score/sentiment) — the quote-generation prompt needs the actual analysis
// text (objections, budget mentions, next steps) to propose relevant lines.
export async function getCallContextForContact(
  userId: string,
  contactEmail: string,
  limit = 5
): Promise<QuoteGenerationCallContext[]> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("started_at, created_at, call_analysis(summary, strengths, weaknesses, objections, next_steps)")
    .eq("user_id", userId)
    .eq("contact_email", contactEmail)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;

  type Row = {
    summary: string | null;
    strengths: string[] | null;
    weaknesses: string[] | null;
    objections: string[] | null;
    next_steps: string[] | null;
  };

  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => {
      const analysis = normalizeCallAnalysis(row.call_analysis as Row | Row[] | null);
      return {
        date: (row.started_at ?? row.created_at) as string,
        summary: analysis?.summary ?? null,
        strengths: analysis?.strengths ?? [],
        weaknesses: analysis?.weaknesses ?? [],
        objections: analysis?.objections ?? [],
        next_steps: analysis?.next_steps ?? [],
      };
    })
    .filter((c) => c.summary !== null);
}

// ─── Admin impersonation audit log ─────────────────────────────────────────────

export type ImpersonationLogItem = {
  id: string;
  target_user_id: string;
  admin_identifier: string;
  started_at: string;
  ended_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
};

export async function getImpersonationLogsForUser(
  targetUserId: string,
  limit = 10
): Promise<ImpersonationLogItem[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_impersonation_logs")
    .select("id, target_user_id, admin_identifier, started_at, ended_at, ip_address, user_agent")
    .eq("target_user_id", targetUserId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ImpersonationLogItem[];
}

// ─── Quotes module — sending, public access, acceptance tracking (sous-étape E) ─

export async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { email: string } | null)?.email ?? null;
}

export async function getUserName(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { name: string | null } | null)?.name ?? null;
}

export async function markQuoteAsSent(
  quoteId: string,
  userId: string,
  publicToken: string,
  emailSubject: string,
  emailBody: string
): Promise<void> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Devis introuvable.");
  if ((existing as { status: string }).status !== "draft") {
    throw new Error("Seuls les devis en brouillon peuvent être envoyés.");
  }

  const { error } = await supabaseAdmin
    .from("quotes")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      public_token: publicToken,
      sent_email_subject: emailSubject,
      sent_email_body: emailBody,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quoteId);
  if (error) throw error;
}

// No session check — this backs the public /q/[token] page and its API
// routes, reachable by anyone holding the (unguessable uuid) link.
export async function getQuoteByPublicToken(token: string): Promise<QuoteWithLines | null> {
  const { data: quote, error } = await supabaseAdmin
    .from("quotes")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!quote) return null;

  const { data: lines, error: linesError } = await supabaseAdmin
    .from("quote_lines")
    .select("*")
    .eq("quote_id", (quote as Quote).id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (linesError) throw linesError;

  return { ...(quote as Quote), lines: (lines ?? []) as QuoteLine[] };
}

// Single conditional UPDATE (not select-then-update) — the `.is("viewed_at",
// null)` filter makes this atomic at the DB level, so N concurrent opens
// still only ever record the first one, with no read/write race window.
export async function markQuoteAsViewed(token: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("quotes")
    .update({ viewed_at: new Date().toISOString() })
    .eq("public_token", token)
    .is("viewed_at", null);
  if (error) throw error;
}

export type AcceptQuoteResult = { ok: true; quote: Quote } | { ok: false; error: string };

// Same compare-and-swap idea as markQuoteAsViewed's atomic guard: the update
// re-asserts the status we just read in its own WHERE clause, so a second
// concurrent accept/reject (double-click, retried request) affects zero rows
// and comes back as a clear, explicit failure rather than silently
// re-accepting or racing the first request.
export async function acceptQuoteByPublicToken(token: string): Promise<AcceptQuoteResult> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("quotes")
    .select("id, status")
    .eq("public_token", token)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) return { ok: false, error: "Devis introuvable." };

  const status = (existing as { status: string }).status;
  if (status === "accepted" || status === "rejected") {
    return { ok: false, error: `Ce devis a déjà été ${status === "accepted" ? "accepté" : "refusé"}.` };
  }

  const { data: updated, error } = await supabaseAdmin
    .from("quotes")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), acceptance_notified: false })
    .eq("id", (existing as { id: string }).id)
    .eq("status", status)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!updated) {
    return { ok: false, error: "Ce devis a déjà été traité." };
  }

  return { ok: true, quote: updated as Quote };
}

export type RejectQuoteResult = { ok: true } | { ok: false; error: string };

export async function rejectQuoteByPublicToken(token: string, reason: string | null): Promise<RejectQuoteResult> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("quotes")
    .select("id, status")
    .eq("public_token", token)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) return { ok: false, error: "Devis introuvable." };

  const status = (existing as { status: string }).status;
  if (status === "accepted" || status === "rejected") {
    return { ok: false, error: `Ce devis a déjà été ${status === "accepted" ? "accepté" : "refusé"}.` };
  }

  const { data: updated, error } = await supabaseAdmin
    .from("quotes")
    .update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason })
    .eq("id", (existing as { id: string }).id)
    .eq("status", status)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updated) {
    return { ok: false, error: "Ce devis a déjà été traité." };
  }

  return { ok: true };
}

export type PendingAcceptanceNotification = {
  quote_id: string;
  quote_number: string;
  client_name: string;
  total_ttc: number;
  accepted_at: string | null;
};

export async function listPendingAcceptanceNotifications(
  userId: string
): Promise<PendingAcceptanceNotification[]> {
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("id, quote_number, client_name, total_ttc, accepted_at")
    .eq("user_id", userId)
    .eq("status", "accepted")
    .eq("acceptance_notified", false)
    .order("accepted_at", { ascending: false });
  if (error) throw error;

  return (
    (data ?? []) as Array<{
      id: string;
      quote_number: string;
      client_name: string;
      total_ttc: number;
      accepted_at: string | null;
    }>
  ).map((q) => ({
    quote_id: q.id,
    quote_number: q.quote_number,
    client_name: q.client_name,
    total_ttc: q.total_ttc,
    accepted_at: q.accepted_at,
  }));
}

export async function markAcceptanceNotified(quoteId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("quotes")
    .update({ acceptance_notified: true })
    .eq("id", quoteId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ─── Tasks module — configurable templates (sous-étape A) ──────────────────────

export type TaskTriggerType = "post_call" | "email_sent_no_reply" | "quote_sent_no_reply";

export type TaskTemplate = {
  id: string;
  user_id: string;
  trigger_type: TaskTriggerType;
  offset_hours: number;
  task_type: string;
  title: string;
  description: string | null;
  action_type: string;
  enabled: boolean;
  push_to_hubspot: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function listTaskTemplates(userId: string): Promise<TaskTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from("task_templates")
    .select("*")
    .eq("user_id", userId)
    .order("trigger_type", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskTemplate[];
}

export type TaskTemplateInput = {
  trigger_type: TaskTriggerType;
  offset_hours: number;
  task_type: string;
  title: string;
  description?: string | null;
  action_type: string;
  sort_order?: number;
  enabled?: boolean;
  push_to_hubspot?: boolean;
};

export async function createTaskTemplate(userId: string, data: TaskTemplateInput): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from("task_templates")
    .insert({
      user_id: userId,
      trigger_type: data.trigger_type,
      offset_hours: data.offset_hours,
      task_type: data.task_type,
      title: data.title,
      description: data.description ?? null,
      action_type: data.action_type,
      sort_order: data.sort_order ?? 0,
      enabled: data.enabled ?? true,
      push_to_hubspot: data.push_to_hubspot ?? false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (row as { id: string }).id;
}

export async function updateTaskTemplate(
  templateId: string,
  userId: string,
  data: Partial<TaskTemplateInput>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("task_templates")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteTaskTemplate(templateId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("task_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId);
  if (error) throw error;
}

const DEFAULT_TASK_TEMPLATES: TaskTemplateInput[] = [
  // Après un call
  {
    trigger_type: "post_call",
    offset_hours: 0,
    task_type: "mail_recap",
    title: "Envoyer un email de récap",
    description: "Récapituler les points discutés et prochaines étapes",
    action_type: "open_gmail_draft",
    sort_order: 0,
  },
  {
    trigger_type: "post_call",
    offset_hours: 48,
    task_type: "relance_email",
    title: "Relancer si pas de réponse",
    description: "Vérifier si le prospect a répondu, relancer sinon",
    action_type: "open_gmail_draft",
    sort_order: 1,
  },
  {
    trigger_type: "post_call",
    offset_hours: 168,
    task_type: "relance_email",
    title: "Deuxième relance",
    description: "Relance 7 jours après le call si toujours pas de réponse",
    action_type: "open_gmail_draft",
    sort_order: 2,
  },
  // Après un email envoyé
  {
    trigger_type: "email_sent_no_reply",
    offset_hours: 72,
    task_type: "relance_email",
    title: "Relancer après email",
    description: "Aucune réponse 3 jours après l'envoi",
    action_type: "open_gmail_draft",
    sort_order: 0,
  },
  // Après un devis envoyé
  {
    trigger_type: "quote_sent_no_reply",
    offset_hours: 48,
    task_type: "relance_email",
    title: "Relancer après envoi du devis",
    description: "Vérifier si le devis a été consulté",
    action_type: "open_gmail_draft",
    sort_order: 0,
  },
  {
    trigger_type: "quote_sent_no_reply",
    offset_hours: 168,
    task_type: "relance_call",
    title: "Appeler pour débloquer",
    description: "Devis envoyé depuis 7 jours sans acceptation — proposer un appel",
    action_type: "none",
    sort_order: 1,
  },
];

export async function ensureDefaultTaskTemplates(userId: string): Promise<void> {
  const { count, error } = await supabaseAdmin
    .from("task_templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  if (count && count > 0) return;

  const { error: insertError } = await supabaseAdmin
    .from("task_templates")
    .insert(DEFAULT_TASK_TEMPLATES.map((t) => ({ ...t, user_id: userId })));
  if (insertError) throw insertError;
}

// ─── Tasks module — generation from real events (sous-étape B) ─────────────────

export type TaskSourceType = "call" | "email" | "quote";

const TRIGGER_TYPE_BY_SOURCE: Record<TaskSourceType, TaskTriggerType> = {
  call: "post_call",
  email: "email_sent_no_reply",
  quote: "quote_sent_no_reply",
};

export type TaskContactData = {
  contact_id: string | null;
  contact_email: string | null;
  contact_name: string | null;
};

export type CreatedTaskForHubSpot = {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
};

export type GenerateTasksResult = {
  createdCount: number;
  // Subset of the newly-created rows whose template has push_to_hubspot
  // enabled — the caller (bot-webhook route, Inngest crons) pushes these to
  // HubSpot itself, since that's an external API call and doesn't belong in
  // this DB-only module.
  toPushToHubSpot: CreatedTaskForHubSpot[];
};

// Idempotent — relies on the UNIQUE (user_id, template_id, source_type,
// source_id) constraint + upsert/ignoreDuplicates, so calling this twice for
// the same source (e.g. a retried webhook) never creates duplicate tasks
// (and never double-pushes to HubSpot, since ignored duplicates are absent
// from the returned/toPushToHubSpot rows).
export async function generateTasksFromTemplates(
  userId: string,
  sourceType: TaskSourceType,
  sourceId: string,
  contactData: TaskContactData
): Promise<GenerateTasksResult> {
  const triggerType = TRIGGER_TYPE_BY_SOURCE[sourceType];

  const { data: templates, error } = await supabaseAdmin
    .from("task_templates")
    .select("id, offset_hours, task_type, title, description, action_type, push_to_hubspot")
    .eq("user_id", userId)
    .eq("trigger_type", triggerType)
    .eq("enabled", true);
  if (error) throw error;

  const rows = (templates ?? []) as Array<{
    id: string;
    offset_hours: number;
    task_type: string;
    title: string;
    description: string | null;
    action_type: string;
    push_to_hubspot: boolean;
  }>;
  if (rows.length === 0) return { createdCount: 0, toPushToHubSpot: [] };

  const now = Date.now();
  const pushableTemplateIds = new Set(rows.filter((t) => t.push_to_hubspot).map((t) => t.id));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("tasks")
    .upsert(
      rows.map((t) => ({
        user_id: userId,
        template_id: t.id,
        contact_id: contactData.contact_id,
        contact_email: contactData.contact_email,
        contact_name: contactData.contact_name,
        source_type: sourceType,
        source_id: sourceId,
        task_type: t.task_type,
        title: t.title,
        description: t.description,
        action_type: t.action_type,
        due_at: new Date(now + t.offset_hours * 60 * 60 * 1000).toISOString(),
      })),
      { onConflict: "user_id,template_id,source_type,source_id", ignoreDuplicates: true }
    )
    .select("id, template_id, title, description, due_at");
  if (insertError) throw insertError;

  const insertedRows = (inserted ?? []) as Array<{
    id: string;
    template_id: string;
    title: string;
    description: string | null;
    due_at: string;
  }>;

  return {
    createdCount: insertedRows.length,
    toPushToHubSpot: insertedRows
      .filter((r) => pushableTemplateIds.has(r.template_id))
      .map((r) => ({ id: r.id, title: r.title, description: r.description, due_at: r.due_at })),
  };
}

// Called once a task has been pushed to HubSpot (see lib/tasks-hubspot-sync.ts)
// so later completion/dismissal/polling knows which HubSpot object to update.
export async function linkHubSpotTaskId(taskId: string, hubspotTaskId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("tasks").update({ hubspot_task_id: hubspotTaskId }).eq("id", taskId);
  if (error) throw error;
}

export type TaskListItem = {
  id: string;
  user_id: string;
  template_id: string | null;
  contact_id: string | null;
  contact_email: string | null;
  contact_name: string | null;
  source_type: string;
  source_id: string | null;
  task_type: string;
  title: string;
  description: string | null;
  action_type: string;
  due_at: string;
  completed_at: string | null;
  dismissed_at: string | null;
  hubspot_task_id: string | null;
  created_at: string;
};

// contact_id/contact_email/contact_name are already denormalized onto tasks
// itself at creation time (same snapshot pattern as quotes' client_* fields),
// so no join to contacts is needed to display them.
export async function listTasksForUser(
  userId: string,
  filter: "pending" | "completed" | "all" = "pending"
): Promise<TaskListItem[]> {
  let query = supabaseAdmin.from("tasks").select("*").eq("user_id", userId);

  if (filter === "pending") {
    query = query.is("completed_at", null).is("dismissed_at", null);
  } else if (filter === "completed") {
    query = query.not("completed_at", "is", null);
  }

  const { data, error } = await query.order("due_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskListItem[];
}

// Returns the linked hubspot_task_id (or null) so the caller (the
// /api/tasks/[taskId]/complete route) knows whether there's a HubSpot task
// to also mark COMPLETED — kept out of this function itself since that's an
// external API call, not a DB concern.
export async function completeTask(taskId: string, userId: string): Promise<{ hubspot_task_id: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("hubspot_task_id")
    .single();
  if (error) throw error;
  return data as { hubspot_task_id: string | null };
}

// Same shape as completeTask — the /api/tasks/[taskId]/dismiss route uses
// hubspot_task_id to also delete the linked HubSpot task.
export async function dismissTask(taskId: string, userId: string): Promise<{ hubspot_task_id: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("hubspot_task_id")
    .single();
  if (error) throw error;
  return data as { hubspot_task_id: string | null };
}

export async function countPendingTasksDueToday(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("completed_at", null)
    .is("dismissed_at", null)
    .lte("due_at", cutoff);
  if (error) throw error;
  return count ?? 0;
}

// ─── Tasks module — cron trigger sources ────────────────────────────────────────

export type UnansweredFollowUpCall = {
  id: string;
  user_id: string;
  contact_email: string | null;
  company_name: string | null;
};

// "Email sent" in this codebase means a call's follow-up email
// (calls.follow_up_sent_at / calls.replied_at) — there is no separate
// sent-emails table.
export async function getCallsWithUnansweredFollowUps(): Promise<UnansweredFollowUpCall[]> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("id, user_id, contact_email, company_name")
    .not("follow_up_sent_at", "is", null)
    .is("replied_at", null)
    .gte("follow_up_sent_at", cutoff);
  if (error) throw error;
  return (data ?? []) as UnansweredFollowUpCall[];
}

export type UnansweredQuote = {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string | null;
  contact_id: string | null;
};

export async function getQuotesAwaitingAcceptance(): Promise<UnansweredQuote[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("id, user_id, client_name, client_email, contact_id")
    .eq("status", "sent")
    .gte("sent_at", cutoff);
  if (error) throw error;
  return (data ?? []) as UnansweredQuote[];
}

export type OpenHubSpotLinkedTask = { id: string; user_id: string; hubspot_task_id: string };

// Feeds the HubSpot task status polling cron (lib/inngest-functions.ts) —
// HubSpot's Webhooks API doesn't support subscribing to task/engagement
// changes, so this is the only way to learn a task was completed or deleted
// on the HubSpot side. Only still-open tasks matter here: once a task is
// completed/dismissed on the Brief side there's nothing left to reconcile.
export async function getOpenTasksWithHubSpotLink(): Promise<OpenHubSpotLinkedTask[]> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("id, user_id, hubspot_task_id")
    .not("hubspot_task_id", "is", null)
    .is("completed_at", null)
    .is("dismissed_at", null);
  if (error) throw error;
  return (data ?? []) as OpenHubSpotLinkedTask[];
}

// ─── Tasks module — list views (sous-étape C) ──────────────────────────────────

export type TaskUrgencyGroup = "overdue" | "today" | "this_week" | "later";

export type GroupedTasks = Record<TaskUrgencyGroup, TaskListItem[]>;

// Single query, split client-side by due_at delta — cheaper than 4 separate
// range queries, and since the source query is already ordered by due_at asc,
// each bucket comes out pre-sorted for free.
export async function listPendingTasksGrouped(userId: string): Promise<GroupedTasks> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .is("completed_at", null)
    .is("dismissed_at", null)
    .order("due_at", { ascending: true });
  if (error) throw error;

  const tasks = (data ?? []) as TaskListItem[];
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  const grouped: GroupedTasks = { overdue: [], today: [], this_week: [], later: [] };
  for (const task of tasks) {
    const delta = new Date(task.due_at).getTime() - now;
    if (delta < 0) grouped.overdue.push(task);
    else if (delta < oneDayMs) grouped.today.push(task);
    else if (delta < sevenDaysMs) grouped.this_week.push(task);
    else grouped.later.push(task);
  }
  return grouped;
}

export async function listCompletedTasks(userId: string, limit = 20): Promise<TaskListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TaskListItem[];
}

// ─── Tasks module — per-task email generation/sending (sous-étape D) ───────────

export async function getTaskById(taskId: string, userId: string): Promise<TaskListItem | null> {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as TaskListItem | null;
}

// Conditional update (not a plain set) — a "call" task's generated email is
// the first follow-up ever sent for that call, but if one was already
// recorded (e.g. sent from the feedback page), this must not clobber it.
export async function markCallFollowUpSentIfUnset(callId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("calls")
    .update({ follow_up_sent_at: new Date().toISOString() })
    .eq("id", callId)
    .is("follow_up_sent_at", null);
  if (error) throw error;
}

// ─── Playbook module — manager-configurable scoring rubric (sous-étape A) ──────
// One playbook per organization (UNIQUE organization_id), each with ordered
// dimensions, each dimension with ordered guiding questions (criteria).
// call_analysis_system_prompt and the /feedback + /team score displays are
// NOT wired to this yet — that's sous-étapes B and D.

export type PlaybookCriterion = {
  id: string;
  dimension_id: string;
  question: string;
  sort_order: number;
  created_at: string;
};

export type PlaybookDimension = {
  id: string;
  playbook_id: string;
  key: string;
  label: string;
  description: string | null;
  weight: number;
  sort_order: number;
  created_at: string;
  criteria: PlaybookCriterion[];
};

export type Playbook = {
  id: string;
  organization_id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  dimensions: PlaybookDimension[];
};

function slugifyPlaybookKey(label: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "dimension";
}

export async function getPlaybookForOrganization(orgId: string): Promise<Playbook | null> {
  const { data: playbookRow, error: playbookError } = await supabaseAdmin
    .from("playbooks")
    .select("*")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (playbookError) throw playbookError;
  if (!playbookRow) return null;

  const { data: dimensionRows, error: dimensionsError } = await supabaseAdmin
    .from("playbook_dimensions")
    .select("*")
    .eq("playbook_id", (playbookRow as { id: string }).id)
    .order("sort_order", { ascending: true });
  if (dimensionsError) throw dimensionsError;
  const dimensions = (dimensionRows ?? []) as Omit<PlaybookDimension, "criteria">[];

  const criteriaByDimension = new Map<string, PlaybookCriterion[]>();
  if (dimensions.length > 0) {
    const { data: criteriaRows, error: criteriaError } = await supabaseAdmin
      .from("playbook_criteria")
      .select("*")
      .in("dimension_id", dimensions.map((d) => d.id))
      .order("sort_order", { ascending: true });
    if (criteriaError) throw criteriaError;
    for (const row of (criteriaRows ?? []) as PlaybookCriterion[]) {
      const list = criteriaByDimension.get(row.dimension_id) ?? [];
      list.push(row);
      criteriaByDimension.set(row.dimension_id, list);
    }
  }

  return {
    ...(playbookRow as Omit<Playbook, "dimensions">),
    dimensions: dimensions.map((d) => ({ ...d, criteria: criteriaByDimension.get(d.id) ?? [] })),
  };
}

type DefaultPlaybookDimensionSeed = {
  key: string;
  label: string;
  weight: number;
  sort_order: number;
  questions: string[];
};

const DEFAULT_PLAYBOOK_DIMENSIONS: DefaultPlaybookDimensionSeed[] = [
  {
    key: "opening_framing",
    label: "Ouverture & cadrage",
    weight: 1,
    sort_order: 0,
    questions: [
      "Le commercial s'est-il présenté clairement ?",
      "L'agenda et l'objectif du call ont-ils été posés dès le début ?",
    ],
  },
  {
    key: "pain_point",
    label: "Découverte des besoins",
    weight: 1,
    sort_order: 1,
    questions: [
      "Le prospect a-t-il exprimé un problème concret à résoudre ?",
      "Le commercial a-t-il creusé les enjeux business ?",
      "Le budget a-t-il été abordé ?",
    ],
  },
  {
    key: "pitch_demo",
    label: "Pitch & démo",
    weight: 1,
    sort_order: 2,
    questions: [
      "Le pitch a-t-il été personnalisé selon les besoins du prospect ?",
      "La démo a-t-elle mis en avant les cas d'usage pertinents ?",
    ],
  },
  {
    key: "next_step",
    label: "Prochaine étape",
    weight: 1,
    sort_order: 3,
    questions: [
      "Une prochaine action concrète a-t-elle été fixée avec date ?",
      "Les décideurs ont-ils été identifiés pour la suite ?",
    ],
  },
];

// Idempotent — only seeds if the org has no playbook yet (UNIQUE
// organization_id also protects against a concurrent double-call). Call this
// from the manager's first visit to /team/playbook.
export async function ensureDefaultPlaybookForOrganization(orgId: string, createdBy: string): Promise<Playbook> {
  const existing = await getPlaybookForOrganization(orgId);
  if (existing) return existing;

  const { data: playbookRow, error: playbookError } = await supabaseAdmin
    .from("playbooks")
    .insert({ organization_id: orgId, created_by: createdBy })
    .select("id")
    .single();
  if (playbookError) throw playbookError;
  const playbookId = (playbookRow as { id: string }).id;

  for (const dim of DEFAULT_PLAYBOOK_DIMENSIONS) {
    const { data: dimRow, error: dimError } = await supabaseAdmin
      .from("playbook_dimensions")
      .insert({
        playbook_id: playbookId,
        key: dim.key,
        label: dim.label,
        weight: dim.weight,
        sort_order: dim.sort_order,
      })
      .select("id")
      .single();
    if (dimError) throw dimError;
    const dimensionId = (dimRow as { id: string }).id;

    const { error: criteriaError } = await supabaseAdmin.from("playbook_criteria").insert(
      dim.questions.map((question, i) => ({
        dimension_id: dimensionId,
        question,
        sort_order: i,
      }))
    );
    if (criteriaError) throw criteriaError;
  }

  const created = await getPlaybookForOrganization(orgId);
  if (!created) throw new Error("Échec de la création du playbook par défaut.");
  return created;
}

// Used by sous-étape B (call analysis) to load the org's rubric for a given
// commercial's user id.
export async function getPlaybookForUser(userId: string): Promise<Playbook | null> {
  const orgId = await getUserOrganizationId(userId);
  if (!orgId) return null;
  return getPlaybookForOrganization(orgId);
}

// ─── Playbook snapshot (sous-étape B) — frozen copy of the rubric used at
// analysis time, so a call's scores stay interpretable even if the org's
// playbook is edited or restructured afterwards.

export type PlaybookSnapshotDimension = {
  key: string;
  label: string;
  weight: number;
  criteria: string[];
};

export type PlaybookSnapshot = {
  playbook_name: string;
  dimensions: PlaybookSnapshotDimension[];
};

// Derived from the same seed data ensureDefaultPlaybookForOrganization uses,
// so the two can never drift apart.
export const DEFAULT_PLAYBOOK_SNAPSHOT: PlaybookSnapshot = {
  playbook_name: "Playbook par défaut",
  dimensions: DEFAULT_PLAYBOOK_DIMENSIONS.map((d) => ({
    key: d.key,
    label: d.label,
    weight: d.weight,
    criteria: d.questions,
  })),
};

// Called right before invoking Claude — falls back to the hardcoded
// 4-dimension default when the user has no org or no playbook yet, so
// analysis always has a rubric (and a snapshot) to work with.
export async function getPlaybookSnapshotForUser(userId: string): Promise<PlaybookSnapshot> {
  const playbook = await getPlaybookForUser(userId);
  if (!playbook) return DEFAULT_PLAYBOOK_SNAPSHOT;
  return {
    playbook_name: playbook.name,
    dimensions: playbook.dimensions.map((d) => ({
      key: d.key,
      label: d.label,
      weight: d.weight,
      criteria: d.criteria.map((c) => c.question),
    })),
  };
}

// Moved to lib/playbook-scores.ts (sous-étape D) — that module has zero
// server-only dependencies, so client components can import it directly.
// Re-exported here since this is where sous-étape B originally documented it.
export { getEffectiveScoresForDisplay } from "./playbook-scores";
export type { EffectiveScoreItem, ScoresDict } from "./playbook-scores";

export async function updatePlaybookName(playbookId: string, orgId: string, name: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("playbooks")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", playbookId)
    .eq("organization_id", orgId);
  if (error) throw error;
}

// ─── Playbook CRUD — every function below re-derives ownership from orgId
// rather than trusting the caller's ids, so a manager can never read/write
// another organization's playbook even by guessing/reusing ids.

async function assertPlaybookInOrg(playbookId: string, orgId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("playbooks")
    .select("id")
    .eq("id", playbookId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Playbook introuvable pour cette organisation.");
}

async function getDimensionPlaybookId(dimensionId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("playbook_dimensions")
    .select("playbook_id")
    .eq("id", dimensionId)
    .maybeSingle();
  if (error) throw error;
  return (data as { playbook_id: string } | null)?.playbook_id ?? null;
}

async function assertDimensionInOrg(dimensionId: string, orgId: string): Promise<string> {
  const playbookId = await getDimensionPlaybookId(dimensionId);
  if (!playbookId) throw new Error("Dimension introuvable.");
  await assertPlaybookInOrg(playbookId, orgId);
  return playbookId;
}

async function getCriterionDimensionId(criterionId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("playbook_criteria")
    .select("dimension_id")
    .eq("id", criterionId)
    .maybeSingle();
  if (error) throw error;
  return (data as { dimension_id: string } | null)?.dimension_id ?? null;
}

export type PlaybookDimensionInput = {
  key?: string;
  label: string;
  description?: string | null;
  weight?: number;
  sort_order?: number;
};

export async function createPlaybookDimension(
  playbookId: string,
  orgId: string,
  data: PlaybookDimensionInput
): Promise<string> {
  await assertPlaybookInOrg(playbookId, orgId);

  const key = data.key?.trim() || slugifyPlaybookKey(data.label);

  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const { count, error: countError } = await supabaseAdmin
      .from("playbook_dimensions")
      .select("id", { count: "exact", head: true })
      .eq("playbook_id", playbookId);
    if (countError) throw countError;
    sortOrder = count ?? 0;
  }

  const { data: row, error } = await supabaseAdmin
    .from("playbook_dimensions")
    .insert({
      playbook_id: playbookId,
      key,
      label: data.label,
      description: data.description ?? null,
      weight: data.weight ?? 1,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (row as { id: string }).id;
}

export type PlaybookDimensionReplacementInput = {
  label: string;
  description?: string | null;
  weight?: number;
  criteria?: string[];
};

// Wholesale replace — deletes every existing dimension (and its criteria) on
// this playbook and inserts dimensionsData in order. Used by the "import
// from document" flow (sous-étape C), which is explicitly all-or-nothing (no
// incremental merge with what's already there). Guarded against wiping the
// playbook on an empty extraction result.
export async function replacePlaybookDimensions(
  playbookId: string,
  orgId: string,
  dimensionsData: PlaybookDimensionReplacementInput[]
): Promise<Playbook> {
  await assertPlaybookInOrg(playbookId, orgId);

  if (dimensionsData.length === 0) {
    const current = await getPlaybookForOrganization(orgId);
    if (!current) throw new Error("Playbook introuvable pour cette organisation.");
    return current;
  }

  const { data: existingDimensions, error: existingError } = await supabaseAdmin
    .from("playbook_dimensions")
    .select("id")
    .eq("playbook_id", playbookId);
  if (existingError) throw existingError;

  const existingIds = (existingDimensions ?? []).map((d) => (d as { id: string }).id);
  if (existingIds.length > 0) {
    const { error: deleteCriteriaError } = await supabaseAdmin
      .from("playbook_criteria")
      .delete()
      .in("dimension_id", existingIds);
    if (deleteCriteriaError) throw deleteCriteriaError;

    const { error: deleteDimensionsError } = await supabaseAdmin
      .from("playbook_dimensions")
      .delete()
      .eq("playbook_id", playbookId);
    if (deleteDimensionsError) throw deleteDimensionsError;
  }

  for (let i = 0; i < dimensionsData.length; i++) {
    const dim = dimensionsData[i];

    const { data: dimRow, error: dimError } = await supabaseAdmin
      .from("playbook_dimensions")
      .insert({
        playbook_id: playbookId,
        key: slugifyPlaybookKey(dim.label),
        label: dim.label,
        description: dim.description ?? null,
        weight: dim.weight ?? 1,
        sort_order: i,
      })
      .select("id")
      .single();
    if (dimError) throw dimError;
    const dimensionId = (dimRow as { id: string }).id;

    const questions = (dim.criteria ?? []).filter((q) => q.trim());
    if (questions.length > 0) {
      const { error: criteriaError } = await supabaseAdmin.from("playbook_criteria").insert(
        questions.map((question, qi) => ({
          dimension_id: dimensionId,
          question,
          sort_order: qi,
        }))
      );
      if (criteriaError) throw criteriaError;
    }
  }

  const updated = await getPlaybookForOrganization(orgId);
  if (!updated) throw new Error("Échec de la mise à jour du playbook.");
  return updated;
}

export async function updatePlaybookDimension(
  dimensionId: string,
  orgId: string,
  data: Partial<PlaybookDimensionInput>
): Promise<void> {
  await assertDimensionInOrg(dimensionId, orgId);

  const patch: Record<string, unknown> = {};
  if (data.key !== undefined) patch.key = data.key;
  if (data.label !== undefined) patch.label = data.label;
  if (data.description !== undefined) patch.description = data.description;
  if (data.weight !== undefined) patch.weight = data.weight;
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabaseAdmin.from("playbook_dimensions").update(patch).eq("id", dimensionId);
  if (error) throw error;
}

// Guards against leaving a playbook with zero dimensions (an empty playbook
// can't score anything) — deletes the dimension's criteria first since we
// can't assume the FK has ON DELETE CASCADE at the DB level.
export async function deletePlaybookDimension(dimensionId: string, orgId: string): Promise<void> {
  const playbookId = await assertDimensionInOrg(dimensionId, orgId);

  const { count, error: countError } = await supabaseAdmin
    .from("playbook_dimensions")
    .select("id", { count: "exact", head: true })
    .eq("playbook_id", playbookId);
  if (countError) throw countError;
  if ((count ?? 0) <= 1) {
    throw new Error("Impossible de supprimer la dernière dimension du playbook.");
  }

  const { error: criteriaError } = await supabaseAdmin
    .from("playbook_criteria")
    .delete()
    .eq("dimension_id", dimensionId);
  if (criteriaError) throw criteriaError;

  const { error } = await supabaseAdmin.from("playbook_dimensions").delete().eq("id", dimensionId);
  if (error) throw error;
}

export async function reorderPlaybookDimensions(
  playbookId: string,
  orgId: string,
  orderedIds: string[]
): Promise<void> {
  await assertPlaybookInOrg(playbookId, orgId);

  // Every id must actually belong to this playbook, so a manager can't
  // smuggle another org's dimension id into the reorder list.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("playbook_dimensions")
    .select("id")
    .eq("playbook_id", playbookId);
  if (existingError) throw existingError;
  const validIds = new Set((existing ?? []).map((d) => (d as { id: string }).id));
  if (orderedIds.length === 0 || !orderedIds.every((id) => validIds.has(id))) {
    throw new Error("Une ou plusieurs dimensions n'appartiennent pas à ce playbook.");
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabaseAdmin.from("playbook_dimensions").update({ sort_order: index }).eq("id", id)
    )
  );
  for (const r of results) if (r.error) throw r.error;
}

export async function createPlaybookCriterion(
  dimensionId: string,
  orgId: string,
  question: string
): Promise<string> {
  await assertDimensionInOrg(dimensionId, orgId);

  const { count, error: countError } = await supabaseAdmin
    .from("playbook_criteria")
    .select("id", { count: "exact", head: true })
    .eq("dimension_id", dimensionId);
  if (countError) throw countError;

  const { data, error } = await supabaseAdmin
    .from("playbook_criteria")
    .insert({ dimension_id: dimensionId, question, sort_order: count ?? 0 })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function updatePlaybookCriterion(criterionId: string, orgId: string, question: string): Promise<void> {
  const dimensionId = await getCriterionDimensionId(criterionId);
  if (!dimensionId) throw new Error("Question introuvable.");
  await assertDimensionInOrg(dimensionId, orgId);

  const { error } = await supabaseAdmin.from("playbook_criteria").update({ question }).eq("id", criterionId);
  if (error) throw error;
}

export async function deletePlaybookCriterion(criterionId: string, orgId: string): Promise<void> {
  const dimensionId = await getCriterionDimensionId(criterionId);
  if (!dimensionId) throw new Error("Question introuvable.");
  await assertDimensionInOrg(dimensionId, orgId);

  const { error } = await supabaseAdmin.from("playbook_criteria").delete().eq("id", criterionId);
  if (error) throw error;
}

// ─── Email templates module — manager-configurable post-call email prompts
// (Email Templates sous-étape A). One collection per organization, same
// architecture as the Playbook module. Not consumed anywhere yet — that's
// sous-étape B (generate-reply-suggestion, tasks/[id]/generate-email).

export type EmailTemplate = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  sort_order: number;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function getEmailTemplatesForOrganization(orgId: string): Promise<EmailTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .eq("organization_id", orgId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EmailTemplate[];
}

export async function getEmailTemplatesForUser(userId: string): Promise<EmailTemplate[]> {
  const orgId = await getUserOrganizationId(userId);
  if (!orgId) return [];
  return getEmailTemplatesForOrganization(orgId);
}

// Security-critical (sous-étape B): re-derives the CALLER's org from userId
// and only returns the template if it belongs to that same org — never
// trusts the client's claim about which org a template_id belongs to. Used
// by generate-reply-suggestion and tasks/[taskId]/generate-email so a user
// can't read/use another organization's system_prompt by guessing an id.
export async function getEmailTemplateById(templateId: string, userId: string): Promise<EmailTemplate | null> {
  const orgId = await getUserOrganizationId(userId);
  if (!orgId) return null;

  const { data, error } = await supabaseAdmin
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return data as EmailTemplate | null;
}

// A commercial's personal rewrite of an org template's prompt — never
// touches the manager's row in email_templates, only ever read/written by
// the user who owns it. UNIQUE (user_id, template_id) in the DB backs the
// upsert below.
export type EmailTemplateOverride = {
  id: string;
  user_id: string;
  template_id: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
};

export async function getEmailTemplateOverride(userId: string, templateId: string): Promise<EmailTemplateOverride | null> {
  const { data, error } = await supabaseAdmin
    .from("email_template_overrides")
    .select("*")
    .eq("user_id", userId)
    .eq("template_id", templateId)
    .maybeSingle();
  if (error) throw error;
  return data as EmailTemplateOverride | null;
}

// Security-critical (like getEmailTemplateById above, which this reuses):
// re-derives the CALLER's org from userId and only writes the override if
// the template belongs to that org — a template id for another
// organization resolves to null here and throws, so a user can't attach
// (or even confirm the existence of) an override on another org's template
// by guessing an id.
export async function upsertEmailTemplateOverride(userId: string, templateId: string, systemPrompt: string): Promise<void> {
  const template = await getEmailTemplateById(templateId, userId);
  if (!template) {
    throw new Error("Template introuvable pour cette organisation.");
  }

  const { error } = await supabaseAdmin.from("email_template_overrides").upsert(
    {
      user_id: userId,
      template_id: templateId,
      system_prompt: systemPrompt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,template_id" }
  );
  if (error) throw error;
}

// Restores the "use the manager's prompt" behavior — a no-op (not an error)
// if the user had no override to begin with.
export async function deleteEmailTemplateOverride(userId: string, templateId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("email_template_overrides")
    .delete()
    .eq("user_id", userId)
    .eq("template_id", templateId);
  if (error) throw error;
}

// The single read path generation routes use in place of a direct
// template.system_prompt access — the user's personal override always wins
// over the manager's template prompt when one exists. Returns null (rather
// than throwing) when the template doesn't exist or isn't in the caller's
// org, matching getEmailTemplateById's contract so route handlers can 404
// the same way they already do.
export async function getEffectiveEmailTemplateSystemPrompt(userId: string, templateId: string): Promise<string | null> {
  const template = await getEmailTemplateById(templateId, userId);
  if (!template) return null;
  const override = await getEmailTemplateOverride(userId, templateId);
  return override?.system_prompt ?? template.system_prompt;
}

type DefaultEmailTemplateSeed = {
  name: string;
  description: string;
  system_prompt: string;
  sort_order: number;
};

const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplateSeed[] = [
  {
    name: "Call 1 — Découverte",
    description: "Premier rendez-vous : découverte des besoins, cadrage.",
    system_prompt: `Tu rédiges un email de suivi post-call pour un premier rendez-vous de découverte.

Contexte fourni :
- Analyse du call (résumé, points-clés, besoins exprimés, prochaines étapes)
- Infos sur le prospect (nom, entreprise)
- Infos sur le commercial (nom, entreprise)

Tu retournes UNIQUEMENT un JSON strict :
{
  "subject": "...",
  "body": "..."
}

Règles :
- Sujet clair mentionnant l'entreprise du prospect (ex: "Suite à notre échange - [Entreprise]")
- Corps 5-7 phrases : remerciement, récapitulatif des besoins identifiés, valeur ajoutée proposée, prochaines étapes concrètes avec date si possible
- Ton chaleureux et professionnel, en français
- Signature avec juste le prénom du commercial
- N'invente rien qui ne soit pas dans l'analyse du call`,
    sort_order: 0,
  },
  {
    name: "Call 2 — Démo / Proposition",
    description: "Deuxième rendez-vous : présentation détaillée, démonstration.",
    system_prompt: `Tu rédiges un email de suivi post-call pour un rendez-vous de démonstration ou de présentation de proposition.

Contexte fourni :
- Analyse du call
- Infos sur le prospect et le commercial
- Historique récent des échanges

Tu retournes UNIQUEMENT un JSON strict :
{
  "subject": "...",
  "body": "..."
}

Règles :
- Sujet orienté valeur (ex: "Récapitulatif de notre démo - Prochaines étapes")
- Corps 6-8 phrases : reconnaissance des points-clés discutés, réponses aux objections mentionnées, résumé de la solution proposée, clarification des questions restantes, prochaines étapes avec échéance
- Ton engagé, orienté action, en français
- Si un devis a été mentionné, propose de l'envoyer
- Signature avec juste le prénom du commercial`,
    sort_order: 1,
  },
  {
    name: "Call 3 — Closing",
    description: "Rendez-vous de closing : négociation, signature.",
    system_prompt: `Tu rédiges un email de suivi post-call pour un rendez-vous de closing.

Contexte fourni :
- Analyse du call (accords, objections, négociations)
- Infos sur le prospect et le commercial

Tu retournes UNIQUEMENT un JSON strict :
{
  "subject": "...",
  "body": "..."
}

Règles :
- Sujet direct et orienté action (ex: "Prochaines étapes pour finaliser notre collaboration")
- Corps 5-7 phrases : reconnaissance des points d'accord, réaffirmation de la proposition finale, réponse aux dernières objections, appel à l'action clair (signature du devis, planification kick-off, etc.)
- Ton confiant, orienté conclusion, en français
- Signature avec juste le prénom du commercial`,
    sort_order: 2,
  },
];

// Idempotent — only seeds if the org has no templates yet. Call this from
// the manager's first visit to /team/email-templates.
export async function ensureDefaultEmailTemplates(orgId: string, createdBy: string): Promise<EmailTemplate[]> {
  const existing = await getEmailTemplatesForOrganization(orgId);
  if (existing.length > 0) return existing;

  const { error } = await supabaseAdmin.from("email_templates").insert(
    DEFAULT_EMAIL_TEMPLATES.map((t) => ({
      organization_id: orgId,
      name: t.name,
      description: t.description,
      system_prompt: t.system_prompt,
      sort_order: t.sort_order,
      is_default: true,
      created_by: createdBy,
    }))
  );
  if (error) throw error;

  return getEmailTemplatesForOrganization(orgId);
}

export type EmailTemplateInput = {
  name: string;
  description?: string | null;
  system_prompt: string;
  sort_order?: number;
};

export async function createEmailTemplate(
  orgId: string,
  createdBy: string,
  data: EmailTemplateInput
): Promise<string> {
  const org = await getOrganization(orgId);
  if (!org) throw new Error("Organisation introuvable.");

  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const { count, error: countError } = await supabaseAdmin
      .from("email_templates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);
    if (countError) throw countError;
    sortOrder = count ?? 0;
  }

  const { data: row, error } = await supabaseAdmin
    .from("email_templates")
    .insert({
      organization_id: orgId,
      name: data.name,
      description: data.description ?? null,
      system_prompt: data.system_prompt,
      sort_order: sortOrder,
      is_default: false,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (row as { id: string }).id;
}

// Filtered by organization_id in the same query — a manager can never touch
// another org's template even by guessing/reusing an id (same pattern as
// updatePlaybookName).
export async function updateEmailTemplate(
  templateId: string,
  orgId: string,
  data: Partial<EmailTemplateInput>
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.system_prompt !== undefined) patch.system_prompt = data.system_prompt;
  if (data.sort_order !== undefined) patch.sort_order = data.sort_order;

  const { error } = await supabaseAdmin
    .from("email_templates")
    .update(patch)
    .eq("id", templateId)
    .eq("organization_id", orgId);
  if (error) throw error;
}

// Guards against leaving an org with zero templates. Hard delete (no
// criteria/child rows to cascade, unlike playbook dimensions).
export async function deleteEmailTemplate(templateId: string, orgId: string): Promise<void> {
  const { data: template, error: templateError } = await supabaseAdmin
    .from("email_templates")
    .select("id")
    .eq("id", templateId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (templateError) throw templateError;
  if (!template) throw new Error("Template introuvable pour cette organisation.");

  const { count, error: countError } = await supabaseAdmin
    .from("email_templates")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  if (countError) throw countError;
  if ((count ?? 0) <= 1) {
    throw new Error("Impossible de supprimer le dernier template de l'organisation.");
  }

  const { error } = await supabaseAdmin
    .from("email_templates")
    .delete()
    .eq("id", templateId)
    .eq("organization_id", orgId);
  if (error) throw error;
}

export async function reorderEmailTemplates(orgId: string, orderedIds: string[]): Promise<void> {
  // Every id must actually belong to this org, so a manager can't smuggle
  // another org's template id into the reorder list.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("email_templates")
    .select("id")
    .eq("organization_id", orgId);
  if (existingError) throw existingError;
  const validIds = new Set((existing ?? []).map((t) => (t as { id: string }).id));
  if (orderedIds.length === 0 || !orderedIds.every((id) => validIds.has(id))) {
    throw new Error("Un ou plusieurs templates n'appartiennent pas à cette organisation.");
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabaseAdmin.from("email_templates").update({ sort_order: index }).eq("id", id).eq("organization_id", orgId)
    )
  );
  for (const r of results) if (r.error) throw r.error;
}

// ─── Notification preferences (module Distribution Flexible, sous-étape A) ─
// Strictly per-user, never per-organization — a manager has no read or write
// access to a commercial's preferences, even for calls/briefs they're
// otherwise allowed to view. Sous-étapes B/C/D (the actual send points) will
// read via getEffectiveChannelsForUser; nothing sends anything yet.
// NotificationPreference itself lives in lib/notification-preferences.ts
// alongside the other types/constants for this feature — re-exported here
// isn't needed since callers import it from there directly.

export async function getNotificationPreferencesForUser(userId: string): Promise<NotificationPreference[]> {
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("event_type, channel, enabled")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as NotificationPreference[];
}

export async function setNotificationPreference(
  userId: string,
  eventType: NotificationEventType,
  channel: NotificationChannel,
  enabled: boolean
): Promise<NotificationPreference> {
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .upsert(
      { user_id: userId, event_type: eventType, channel, enabled, updated_at: new Date().toISOString() },
      { onConflict: "user_id,event_type,channel" }
    )
    .select("event_type, channel, enabled")
    .single();
  if (error) throw error;
  return data as NotificationPreference;
}

// Used by the sous-étapes B/C/D send points, not by this sous-étape's own
// route/page — returns [] rather than throwing when the user has no
// preferences at all (nothing enabled yet), so a caller can safely treat an
// empty array as "send nowhere" without a separate existence check.
export async function getEffectiveChannelsForUser(
  userId: string,
  eventType: NotificationEventType
): Promise<NotificationChannel[]> {
  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("channel")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .eq("enabled", true);
  if (error) throw error;
  return ((data ?? []) as { channel: NotificationChannel }[]).map((r) => r.channel);
}

// ─── Digest hebdomadaire (module Distribution Flexible, sous-étape 3) ──────
//
// Doesn't fit the (event_type, channel, enabled) shape of
// notification_preferences above: a digest also needs a "when" (Friday
// evening vs Monday morning), which isn't a channel — a dedicated table
// (digest_preferences, one row per user) instead of a new NotificationEventType.

export type DigestTiming = "friday_evening" | "monday_morning";

export type DigestPreference = {
  enabled: boolean;
  timing: DigestTiming;
};

const DEFAULT_DIGEST_PREFERENCE: DigestPreference = { enabled: false, timing: "friday_evening" };

export async function getDigestPreference(userId: string): Promise<DigestPreference> {
  const { data, error } = await supabaseAdmin
    .from("digest_preferences")
    .select("enabled, timing")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as DigestPreference | null) ?? DEFAULT_DIGEST_PREFERENCE;
}

export async function setDigestPreference(userId: string, enabled: boolean, timing: DigestTiming): Promise<void> {
  const { error } = await supabaseAdmin
    .from("digest_preferences")
    .upsert({ user_id: userId, enabled, timing, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

export type DigestRecipient = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

// Feeds the two Inngest crons (lib/inngest-functions.ts) — one call per
// timing value, each cron only processing the users who opted into that
// slot.
export async function getUsersForDigestTiming(timing: DigestTiming): Promise<DigestRecipient[]> {
  const { data: prefs, error: prefsError } = await supabaseAdmin
    .from("digest_preferences")
    .select("user_id")
    .eq("enabled", true)
    .eq("timing", timing);
  if (prefsError) throw prefsError;

  const userIds = (prefs ?? []).map((p) => (p as { user_id: string }).user_id);
  if (userIds.length === 0) return [];

  const { data, error } = await supabaseAdmin.from("users").select("id, email, name, role").in("id", userIds);
  if (error) throw error;
  return (data ?? []) as DigestRecipient[];
}

export type DigestPeriodStats = {
  calls_count: number;
  briefs_count: number;
  avg_score: number | null;
  quotes_sent: number;
  quotes_accepted: number;
};

async function fetchDigestPeriodStats(
  userIds: string[],
  fromISO: string,
  toISO: string
): Promise<Map<string, DigestPeriodStats>> {
  const stats = new Map<string, DigestPeriodStats>(
    userIds.map((id) => [id, { calls_count: 0, briefs_count: 0, avg_score: null, quotes_sent: 0, quotes_accepted: 0 }])
  );
  if (userIds.length === 0) return stats;

  const [briefsRes, callsRes, quotesRes] = await Promise.all([
    supabaseAdmin
      .from("briefs")
      .select("user_id")
      .in("user_id", userIds)
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
    supabaseAdmin
      .from("calls")
      .select("user_id, call_analysis(scores)")
      .in("user_id", userIds)
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
    supabaseAdmin
      .from("quotes")
      .select("user_id, status")
      .in("user_id", userIds)
      .gte("created_at", fromISO)
      .lt("created_at", toISO),
  ]);
  if (briefsRes.error) throw briefsRes.error;
  if (callsRes.error) throw callsRes.error;
  if (quotesRes.error) throw quotesRes.error;

  for (const row of (briefsRes.data ?? []) as { user_id: string }[]) {
    const s = stats.get(row.user_id);
    if (s) s.briefs_count++;
  }

  const scoresByUser = new Map<string, number[]>();
  for (const row of (callsRes.data ?? []) as Array<{
    user_id: string;
    call_analysis: { scores: AnalysisScores | null } | { scores: AnalysisScores | null }[] | null;
  }>) {
    const s = stats.get(row.user_id);
    if (s) s.calls_count++;
    const score = normalizeCallAnalysis(row.call_analysis)?.scores?.global_score;
    if (typeof score === "number") {
      const arr = scoresByUser.get(row.user_id) ?? [];
      arr.push(score);
      scoresByUser.set(row.user_id, arr);
    }
  }
  for (const [userId, scores] of scoresByUser) {
    const s = stats.get(userId);
    if (s && scores.length > 0) s.avg_score = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  for (const row of (quotesRes.data ?? []) as { user_id: string; status: string }[]) {
    const s = stats.get(row.user_id);
    if (!s) continue;
    if (row.status !== "draft") s.quotes_sent++;
    if (row.status === "accepted") s.quotes_accepted++;
  }

  return stats;
}

export type CommercialDigestData = DigestPeriodStats & { prev_avg_score: number | null };

// Single-user variant for the commercial's own personal digest.
export async function getCommercialDigestData(
  userId: string,
  fromISO: string,
  toISO: string,
  prevFromISO: string,
  prevToISO: string
): Promise<CommercialDigestData> {
  const [current, previous] = await Promise.all([
    fetchDigestPeriodStats([userId], fromISO, toISO),
    fetchDigestPeriodStats([userId], prevFromISO, prevToISO),
  ]);
  const currentStats = current.get(userId)!;
  const prevStats = previous.get(userId)!;
  return { ...currentStats, prev_avg_score: prevStats.avg_score };
}

export type ManagerDigestTeamItem = DigestPeriodStats & {
  user_id: string;
  name: string | null;
  email: string;
  prev_avg_score: number | null;
};

// Team-wide variant for the manager's roundup — mirrors getTeamOverview's
// shape/fetch pattern but date-ranged (see that function's comment: it has
// no date filtering at all, hence this separate variant rather than adding
// optional params to it).
export async function getManagerDigestData(
  managerId: string,
  fromISO: string,
  toISO: string,
  prevFromISO: string,
  prevToISO: string
): Promise<ManagerDigestTeamItem[]> {
  const commercials = await getCommercialsForManager(managerId);
  if (commercials.length === 0) return [];
  const commercialIds = commercials.map((c) => c.id);

  const [current, previous] = await Promise.all([
    fetchDigestPeriodStats(commercialIds, fromISO, toISO),
    fetchDigestPeriodStats(commercialIds, prevFromISO, prevToISO),
  ]);

  return commercials.map((c) => {
    const currentStats = current.get(c.id)!;
    const prevStats = previous.get(c.id)!;
    return { ...currentStats, user_id: c.id, name: c.name, email: c.email, prev_avg_score: prevStats.avg_score };
  });
}

export async function getDigestRecipientById(userId: string): Promise<DigestRecipient | null> {
  const { data, error } = await supabaseAdmin.from("users").select("id, email, name, role").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data as DigestRecipient | null;
}

// ─── Digest hebdo — narratif qualitatif (bien fait / à améliorer / à ne pas
// oublier) via lib/digest.ts + lib/admin-config.ts's digest_commercial_prompt
// / digest_manager_prompt. Raw material only — the actual Claude call lives
// in lib/digest.ts, not here (lib/db.ts stays queries-only).

export type DigestCallInsight = {
  user_id: string;
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  objections: string[];
  next_steps: string[];
};

export async function getDigestCallInsights(userIds: string[], fromISO: string, toISO: string): Promise<DigestCallInsight[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("user_id, call_analysis(summary, strengths, weaknesses, objections, next_steps)")
    .in("user_id", userIds)
    .gte("created_at", fromISO)
    .lt("created_at", toISO);
  if (error) throw error;

  return ((data ?? []) as Array<{ user_id: string; call_analysis: CallAnalysisRow | CallAnalysisRow[] | null }>)
    .map((row) => {
      const analysis = normalizeCallAnalysis(row.call_analysis);
      if (!analysis) return null;
      return {
        user_id: row.user_id,
        summary: analysis.summary,
        strengths: analysis.strengths ?? [],
        weaknesses: analysis.weaknesses ?? [],
        objections: analysis.objections ?? [],
        next_steps: analysis.next_steps ?? [],
      };
    })
    .filter((x): x is DigestCallInsight => x !== null);
}

export type DigestPendingTask = { user_id: string; title: string; due_at: string };

// Same "not completed, not dismissed" definition as listTasksForUser's
// "pending" filter — not date-ranged (a task from 3 weeks ago still pending
// is exactly the kind of thing a digest should surface as "don't forget").
export async function getDigestPendingTasks(userIds: string[]): Promise<DigestPendingTask[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("user_id, title, due_at")
    .in("user_id", userIds)
    .is("completed_at", null)
    .is("dismissed_at", null);
  if (error) throw error;
  return (data ?? []) as DigestPendingTask[];
}

export type DigestPendingQuote = { user_id: string; client_name: string; issued_at: string };

export async function getDigestPendingQuotes(userIds: string[]): Promise<DigestPendingQuote[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("quotes")
    .select("user_id, client_name, issued_at")
    .in("user_id", userIds)
    .eq("status", "sent");
  if (error) throw error;
  return (data ?? []) as DigestPendingQuote[];
}

// ─── Playbook via Notion (module Team, sous-étape import) ───────────────────
//
// One connection per ORGANIZATION, not per user — the playbook itself is
// one-per-org (see getTeamOverview's comment elsewhere), so this can't reuse
// the per-user crm_connections table the way lib/slack.ts does. Internal
// Integration token (not OAuth): Notion's public/OAuth integrations require
// a Notion security review before they work for real users, which would
// block this feature indefinitely — see lib/notion.ts for the full rationale.

export type PlaybookNotionConnection = { access_token: string; connected_by_user_id: string | null };

export async function getPlaybookNotionConnection(organizationId: string): Promise<PlaybookNotionConnection | null> {
  const { data, error } = await supabaseAdmin
    .from("playbook_notion_connections")
    .select("access_token, connected_by_user_id")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data as PlaybookNotionConnection | null;
}

export async function savePlaybookNotionConnection(
  organizationId: string,
  accessToken: string,
  connectedByUserId: string
): Promise<void> {
  const { error } = await supabaseAdmin.from("playbook_notion_connections").upsert(
    {
      organization_id: organizationId,
      access_token: accessToken,
      connected_by_user_id: connectedByUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" }
  );
  if (error) throw error;
}

export async function deletePlaybookNotionConnection(organizationId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("playbook_notion_connections").delete().eq("organization_id", organizationId);
  if (error) throw error;
}

// ─── Dashboard (page d'accueil) ─────────────────────────────────────────────
//
// Raw per-call scores since a given date, un-aggregated — bucketing by week
// happens in lib/dashboard.ts (Europe/Paris week boundaries, same convention
// as lib/digest.ts), which is business logic, not a query, so it doesn't
// belong here.

export type CallScorePoint = { created_at: string; global_score: number | null };

export async function getRecentCallScores(userId: string, sinceISO: string): Promise<CallScorePoint[]> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("created_at, call_analysis(scores)")
    .eq("user_id", userId)
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<{ created_at: string; call_analysis: CallAnalysisRow | CallAnalysisRow[] | null }>).map((row) => ({
    created_at: row.created_at,
    global_score: normalizeCallAnalysis(row.call_analysis)?.scores?.global_score ?? null,
  }));
}

export async function getRecentTeamCallScores(userIds: string[], sinceISO: string): Promise<CallScorePoint[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select("created_at, call_analysis(scores)")
    .in("user_id", userIds)
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<{ created_at: string; call_analysis: CallAnalysisRow | CallAnalysisRow[] | null }>).map((row) => ({
    created_at: row.created_at,
    global_score: normalizeCallAnalysis(row.call_analysis)?.scores?.global_score ?? null,
  }));
}
