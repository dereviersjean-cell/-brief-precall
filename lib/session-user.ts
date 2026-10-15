import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { getImpersonationTarget } from "./impersonation";
import { supabaseAdmin } from "./supabase";
import type { UserRole } from "./db";

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

// Le même utilisateur effectif, avec son rôle et son organisation, en UNE
// requête — pour les pages serveur qui enchaînaient `getEffectiveUserId` puis
// `Promise.all([getUserRole, getUserOrganizationId])` (deux selects de la même
// ligne). Pendant de `requireActiveUserContext` côté API.
//
// `import type` pour UserRole : effacé à la compilation, lib/db.ts n'est pas
// tiré par ce module.
export type Viewer = { userId: string; role: UserRole | null; organizationId: string | null };

export async function getViewer(): Promise<Viewer | null> {
  const userId = await getEffectiveUserId();
  if (!userId) return null;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("role, organization_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as { role: UserRole | null; organization_id: string | null };
  return { userId, role: row.role, organizationId: row.organization_id };
}
