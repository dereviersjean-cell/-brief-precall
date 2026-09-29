import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import { isAdminAuthenticated } from "./admin-auth";

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
//
// ET le cookie n'est honoré que pour un administrateur authentifié. Jusqu'au
// 29/09/2026 seule sa présence comptait : n'importe qui pouvait le poser dans
// son navigateur, avec l'identifiant d'un utilisateur, et agir en son nom sur
// toutes les routes d'API — sans même être connecté (requireActiveUser le lit
// AVANT la session). Vérifié en prod sur un compte de test, puis corrigé.
export async function getImpersonationTarget(): Promise<ImpersonationTarget | null> {
  const cookieStore = await cookies();
  const targetUserId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!targetUserId) return null;
  if (!(await isAdminAuthenticated())) return null;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email, disabled_at")
    .eq("id", targetUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.disabled_at != null) return null;

  return { id: data.id as string, name: data.name as string | null, email: data.email as string };
}
