import { supabase } from "./supabase";

export async function upsertUser(
  email: string,
  name: string | null,
  avatarUrl: string | null
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data: existing, error: selectError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase
      .from("user_profiles")
      .update(profile)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_profiles")
      .insert({ user_id: userId, ...profile });
    if (error) throw error;
  }
}

export async function getBriefById(briefId: string): Promise<{ content: unknown; company_name: string | null } | null> {
  const { data, error } = await supabase
    .from("briefs")
    .select("content, company_name")
    .eq("id", briefId)
    .maybeSingle();

  if (error) throw error;
  return data as { content: unknown; company_name: string | null } | null;
}

export async function getAdminConfig(key: string): Promise<unknown> {
  const { data, error } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data?.value ?? null;
}

export async function setAdminConfig(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("admin_config")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) throw error;
}
