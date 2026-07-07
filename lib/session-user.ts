import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { getImpersonationTarget } from "./impersonation";

// Common helper for protected server-component pages — mirrors
// requireActiveUser's precedence (impersonation cookie first, session
// fallback) so that "/dashboard" etc. render as the impersonated user when an
// admin is impersonating, with no NextAuth session required on the admin's
// side at all.
export async function getEffectiveUserId(): Promise<string | null> {
  const impersonationTarget = await getImpersonationTarget();
  if (impersonationTarget) {
    return impersonationTarget.id;
  }

  const session = await getServerSession(authOptions);
  return (session as { supabaseUserId?: string } | null)?.supabaseUserId ?? null;
}
