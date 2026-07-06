import { supabaseAdmin } from "./supabase";
import { generateEmbedding } from "./embeddings";

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

export async function createCall(data: CallData): Promise<{ id: string }> {
  const { data: row, error } = await supabaseAdmin
    .from("calls")
    .insert(data)
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
  analysis: CallAnalysisRow | null;
};

export async function getCallsWithAnalysis(userId: string): Promise<CallWithAnalysis[]> {
  const { data, error } = await supabaseAdmin
    .from("calls")
    .select(
      "id, contact_email, company_name, created_at, started_at, status, duration_seconds, participant_count, follow_up_email, follow_up_sent_at, recall_bot_id, call_analysis(id, scores, strengths, weaknesses, objections, next_steps, summary, sentiment)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const analyses = row.call_analysis as CallAnalysisRow[] | null;
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
      analysis: analyses?.[0] ?? null,
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
      "id, contact_email, company_name, created_at, started_at, status, duration_seconds, participant_count, follow_up_email, follow_up_sent_at, recall_bot_id, call_analysis(id, scores, strengths, weaknesses, objections, next_steps, summary, sentiment)"
    )
    .eq("id", callId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const analyses = row.call_analysis as CallAnalysisRow[] | null;
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
    analysis: analyses?.[0] ?? null,
  };
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
    const analyses = row.call_analysis as Array<{ scores: unknown; sentiment: string | null }> | null;
    const analysis = analyses?.[0] ?? null;
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
    const analyses = row.call_analysis as Array<{ scores: unknown; sentiment: string | null; summary: string | null }> | null;
    const analysis = analyses?.[0] ?? null;
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
  briefs_count: number;
  calls_count: number;
  emails_sent_count: number;
  last_activity_at: string | null;
  recall_connected: boolean;
  crm_connected: string[];
};

export async function getAdminDashboardStats(): Promise<UserDashboardStat[]> {
  const [usersRes, briefsRes, callsRes, crmRes] = await Promise.all([
    supabaseAdmin.from("users").select("id, email, created_at, recall_calendar_id").order("created_at", { ascending: false }),
    supabaseAdmin.from("briefs").select("user_id, created_at"),
    supabaseAdmin.from("calls").select("user_id, created_at, follow_up_sent_at"),
    supabaseAdmin.from("crm_connections").select("user_id, provider"),
  ]);

  const users = (usersRes.data ?? []) as { id: string; email: string; created_at: string; recall_calendar_id: string | null }[];
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
      briefs_count: userBriefs.length,
      calls_count: userCalls.length,
      emails_sent_count: userCalls.filter((c) => c.follow_up_sent_at != null).length,
      last_activity_at: allDates[0] ?? null,
      recall_connected: user.recall_calendar_id != null,
      crm_connected: crm.filter((c) => c.user_id === user.id).map((c) => c.provider),
    };
  });
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

export type LinkedUser = {
  id: string;
  name: string | null;
  email: string;
};

export async function getCommercialsForManager(managerId: string): Promise<LinkedUser[]> {
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
    .in("id", commercialIds);
  if (error) throw error;
  return (data ?? []) as LinkedUser[];
}

export async function getManagersForCommercial(commercialId: string): Promise<LinkedUser[]> {
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
    .in("id", managerIds);
  if (error) throw error;
  return (data ?? []) as LinkedUser[];
}

export async function linkManagerToCommercial(managerId: string, commercialId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("manager_commercial_links")
    .upsert(
      { manager_id: managerId, commercial_id: commercialId },
      { onConflict: "manager_id,commercial_id", ignoreDuplicates: true }
    );
  if (error) throw error;
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
    call_analysis: { scores: AnalysisScores | null }[] | null;
  }>;

  return commercials.map((c) => {
    const userBriefs = briefs.filter((b) => b.user_id === c.id);
    const userCalls = calls.filter((call) => call.user_id === c.id);
    const globalScores = userCalls
      .map((call) => call.call_analysis?.[0]?.scores?.global_score)
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

  const allScores = ((data ?? []) as Array<{ call_analysis: { scores: AnalysisScores | null }[] | null }>)
    .map((row) => row.call_analysis?.[0]?.scores)
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

  const { error } = await supabaseAdmin.from("call_analysis").insert({
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
  });
  if (error) throw error;
}
