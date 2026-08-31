import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { supabaseAdmin } from "./supabase";
import { getImpersonationTarget } from "./impersonation";
import type { UserRole } from "./db";

export type RequireActiveUserResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

// Common guard for protected API routes. A JWT session has no server-side
// revocation, so a user disabled mid-session would otherwise keep a valid
// session until it naturally expires — this re-checks disabled_at against the
// DB on every call. 401 when there's no session at all, 403 when disabled.
//
// The admin impersonation cookie is checked first — this only ever affects
// business-logic routes that call requireActiveUser. /api/admin/* routes use
// isAdminAuthenticated exclusively and never go through here, so an admin
// impersonating a user can't lose (or gain) admin rights via this path.
export async function requireActiveUser(session: Session | null): Promise<RequireActiveUserResult> {
  const impersonationTarget = await getImpersonationTarget();
  if (impersonationTarget) {
    return { ok: true, userId: impersonationTarget.id };
  }

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

// Le garde ET le contexte de l'utilisateur, en UNE requête.
//
// Le motif `requireActiveUser` puis `getUserRole` puis `getUserOrganizationId`
// était présent dans une douzaine de routes — jusqu'à trois fois dans le même
// fichier (objections/categories). Ce sont trois allers-retours Supabase
// séquentiels pour lire trois colonnes de LA MÊME ligne, sur des fonctions qui
// démarrent à froid. Même remède que `getChromeStateForUser` pour l'habillage :
// un seul select.
//
// `import type` pour UserRole : effacé à la compilation, donc ce module ne tire
// pas lib/db.ts (7 200 lignes) dans le bundle de chaque route qui l'importe.
export type RequireActiveUserContextResult =
  | { ok: true; userId: string; role: UserRole | null; organizationId: string | null }
  | { ok: false; response: NextResponse };

export async function requireActiveUserContext(
  session: Session | null
): Promise<RequireActiveUserContextResult> {
  const impersonationTarget = await getImpersonationTarget();
  const userId = impersonationTarget?.id ?? session?.supabaseUserId;

  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("disabled_at, role, organization_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;

  const row = data as { disabled_at: string | null; role: UserRole | null; organization_id: string | null } | null;

  // Même exception que requireActiveUser : en imitation, l'admin doit pouvoir
  // ouvrir le compte d'un utilisateur désactivé, c'est souvent la raison même
  // de l'imitation.
  if (!row || (!impersonationTarget && row.disabled_at != null)) {
    return { ok: false, response: NextResponse.json({ error: "Votre compte a été désactivé." }, { status: 403 }) };
  }

  return { ok: true, userId, role: row.role, organizationId: row.organization_id };
}
