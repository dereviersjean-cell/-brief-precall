import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";

export const IMPERSONATION_COOKIE = "brief_impersonate_user_id";

export type ImpersonationTarget = {
  id: string;
  name: string | null;
  email: string;
};

// Never trusts the cookie value blindly — the target must still exist and
// not be disabled, re-checked on every call (same reasoning as
// requireActiveUser's own disabled_at re-check: no server-side revocation
// otherwise).
export async function getImpersonationTarget(): Promise<ImpersonationTarget | null> {
  const cookieStore = await cookies();
  const targetUserId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!targetUserId) return null;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, disabled_at")
    .eq("id", targetUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.disabled_at != null) return null;

  return { id: data.id as string, name: data.name as string | null, email: data.email as string };
}
