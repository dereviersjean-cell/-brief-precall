import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { supabaseAdmin } from "./supabase";

export type RequireActiveUserResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

// Common guard for protected API routes. A JWT session has no server-side
// revocation, so a user disabled mid-session would otherwise keep a valid
// session until it naturally expires — this re-checks disabled_at against the
// DB on every call. 401 when there's no session at all, 403 when disabled.
export async function requireActiveUser(session: Session | null): Promise<RequireActiveUserResult> {
  const userId = session?.supabaseUserId;
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("disabled_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;

  if (!data || data.disabled_at != null) {
    return { ok: false, response: NextResponse.json({ error: "Votre compte a été désactivé." }, { status: 403 }) };
  }

  return { ok: true, userId };
}
