import { supabaseAdmin } from "./supabase";
import { generateEmbedding } from "./embeddings";
import { computeQuoteTotals } from "./quote-calc";

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

export type AnalysisScores = {
  global_score: number;
  opening_framing: { score: number; description: string };
  pain_point: { score: number; description: string };
  pitch_demo: { score: number; description: string };
  next_step: { score: number; description: string };
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
};

export async function getCallsWithAnalysis(userId: string): Promise<CallWithAnalysis[]> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select(
      "id, contact_email, company_name, created_at, started_at, status, duration_seconds, participant_count, follow_up_email, follow_up_sent_at, recall_bot_id, recording_id, call_analysis(id, scores, strengths, weaknesses, objections, next_steps, summary, sentiment)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const analysis = normalizeCallAnalysis(row.call_analysis as CallAnalysisRow | CallAnalysisRow[] | null);
    return {
      id: row.id as string,
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
      "id, contact_email, company_name, created_at, started_at, status, duration_seconds, participant_count, follow_up_email, follow_up_sent_at, recall_bot_id, recording_id, call_analysis(id, scores, strengths, weaknesses, objections, next_steps, summary, sentiment)"
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

export type TeamAverageScores = {
  global_score: number | null;
  opening_framing: number | null;
  pain_point: number | null;
  pitch_demo: number | null;
  next_step: number | null;
  calls_analyzed_count: number;
};

export async function getTeamAverageScores(managerId: string): Promise<TeamAverageScores> {
  const empty: TeamAverageScores = {
    global_score: null,
    opening_framing: null,
    pain_point: null,
    pitch_demo: null,
    next_step: null,
    calls_analyzed_count: 0,
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
  const dimension = (key: "opening_framing" | "pain_point" | "pitch_demo" | "next_step") =>
    avg(allScores.map((s) => s[key]?.score).filter((v): v is number => typeof v === "number"));

  return {
    global_score: avg(allScores.map((s) => s.global_score)),
    opening_framing: dimension("opening_framing"),
    pain_point: dimension("pain_point"),
    pitch_demo: dimension("pitch_demo"),
    next_step: dimension("next_step"),
    calls_analyzed_count: allScores.length,
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

export async function saveCallAnalysis(
  callId: string,
  analysis: import("./call-analysis").CallAnalysis
): Promise<void> {
  const globalScore = analysis.global_score ?? 0;
  const sentiment =
    globalScore >= 4 ? "positif" : globalScore >= 2.5 ? "neutre" : "négatif";

  const { error } = await supabaseAdmin.from("call_analysis").upsert(
    {
      call_id: callId,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      objections: analysis.objections,
      next_steps: analysis.next_steps,
      summary: analysis.coaching_summary,
      sentiment,
      scores: {
        global_score: analysis.global_score,
        opening_framing: analysis.opening_framing,
        pain_point: analysis.pain_point,
        pitch_demo: analysis.pitch_demo,
        next_step: analysis.next_step,
      },
    },
    { onConflict: "call_id" }
  );
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

// Idempotent — relies on the UNIQUE (user_id, template_id, source_type,
// source_id) constraint + upsert/ignoreDuplicates, so calling this twice for
// the same source (e.g. a retried webhook) never creates duplicate tasks.
// Returns the number of tasks actually created (ignored/duplicate rows are
// not returned by a select() after an ignoreDuplicates upsert).
export async function generateTasksFromTemplates(
  userId: string,
  sourceType: TaskSourceType,
  sourceId: string,
  contactData: TaskContactData
): Promise<number> {
  const triggerType = TRIGGER_TYPE_BY_SOURCE[sourceType];

  const { data: templates, error } = await supabaseAdmin
    .from("task_templates")
    .select("id, offset_hours, task_type, title, description, action_type")
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
  }>;
  if (rows.length === 0) return 0;

  const now = Date.now();
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
    .select("id");
  if (insertError) throw insertError;

  return (inserted ?? []).length;
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

export async function completeTask(taskId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function dismissTask(taskId: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("tasks")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId);
  if (error) throw error;
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
