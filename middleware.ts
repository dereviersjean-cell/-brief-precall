import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { blockingModuleForPath, modulesForPath, resolveEnabledModules, type ModuleKey } from "@/lib/modules";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/brief/:path*",
    "/feedback/:path*",
    "/training/:path*",
    "/contacts/:path*",
    "/quotes/:path*",
    "/tasks/:path*",
    "/settings/:path*",
    "/team/:path*",
    "/help/:path*",
    "/notifications/:path*",
    "/onboarding/:path*",
    "/bienvenue/:path*",
    "/demo/:path*",
    // Routes d'API des modules activables (lib/modules.ts) : seul le verrou
    // de module s'y applique, l'authentification reste l'affaire de chaque
    // route. Toute nouvelle route d'un module doit relever d'un de ces
    // préfixes — sinon elle échappe au verrou.
    "/api/playbook/:path*",
    "/api/email-templates/:path*",
    "/api/feedback/:path*",
    "/api/objections/:path*",
    "/api/crm/:path*",
    "/api/tasks/:path*",
    "/api/training/:path*",
    "/api/digest-preferences/:path*",
    "/api/slack/:path*",
    "/api/client-references/:path*",
  ],
};

// Raw REST call rather than the full supabase-js client / lib/db.ts — keeps
// the middleware bundle minimal and avoids pulling in unrelated dependencies
// (embeddings, Anthropic SDK, etc.) into the edge runtime.
// Billing status is embedded in the same query (organizations via the FK on
// organization_id) rather than a second round-trip.
//
// `organizations(*)` et pas une liste de colonnes : les modules actifs
// (migration 019) viennent de la même ligne, et une colonne nommée qui
// n'existe pas encore ferait échouer toute la requête — donc sauter les
// gardes ci-dessous. `*` rend ce qui existe.
type GateInfo = { disabled: boolean; billingBlocked: boolean; modules: ModuleKey[] };

async function getUserGateInfo(userId: string): Promise<GateInfo> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=disabled_at,organizations(*)`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    // Fail open on infra errors — these are soft gates (admin disable,
    // billing), not the primary auth boundary, so a Supabase hiccup
    // shouldn't lock everyone out.
    if (!res.ok) return { disabled: false, billingBlocked: false, modules: resolveEnabledModules(null) };
    const rows = (await res.json()) as {
      disabled_at: string | null;
      organizations: { billing_status: string; enabled_modules?: string[] | null; training_enabled?: boolean | null } | null;
    }[];
    const row = rows[0];
    // "canceled" bloque au même titre que "blocked" — une résiliation coupe
    // l'accès immédiatement, pas de période de grâce (celle-ci ne s'applique
    // qu'aux échecs de paiement, cf. invoice.payment_failed dans le webhook).
    const status = row?.organizations?.billing_status;
    return {
      disabled: row?.disabled_at != null,
      billingBlocked: status === "blocked" || status === "canceled",
      modules: resolveEnabledModules(row?.organizations),
    };
  } catch {
    return { disabled: false, billingBlocked: false, modules: resolveEnabledModules(null) };
  }
}

// Même calcul que lib/admin-auth.ts, en Web Crypto : le middleware ne charge
// pas le module `crypto` de Node.
async function isAdminCookieValid(request: NextRequest): Promise<boolean> {
  const cookie = request.cookies.get("admin_session")?.value;
  if (!cookie) return false;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`admin_session:${process.env.ADMIN_PASSWORD ?? ""}`)
  );
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return cookie === hex;
}

// L'utilisateur dont les modules s'appliquent : celui qu'un administrateur
// incarne (même règle que lib/impersonation.ts — le cookie ne compte qu'avec
// une session admin valide), sinon celui de la session. L'account manager qui
// ouvre le compte d'un client voit ainsi exactement ce que voit le client.
async function effectiveUserId(request: NextRequest, sessionUserId: string | undefined): Promise<string | undefined> {
  const impersonated = request.cookies.get("brief_impersonate_user_id")?.value;
  if (impersonated && (await isAdminCookieValid(request))) return impersonated;
  return sessionUserId;
}

// Module désactivé = introuvable, jamais « verrouillé » : le client ne doit
// pas savoir qu'il existe avant que l'account manager le lui ouvre.
function moduleNotFound(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/brief";
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  // Les préchargements de Next ne rendent que la frontière de chargement
  // (loading.tsx) : aucune donnée utilisateur n'y transite. Depuis l'ajout de
  // ces frontières le 20/08/2026, un seul chargement de page en déclenche une
  // vingtaine — mesuré dans les logs Vercel — et chacun exécutait ce
  // middleware, donc une requête Supabase pour rien.
  //
  // Le garde n'est pas contourné : la navigation réelle qui suit passe par
  // ici normalement, et c'est elle qui sert des données. Un utilisateur
  // désactivé ou suspendu ne récupère par cette voie qu'un squelette vide.
  if (request.headers.get("next-router-prefetch") === "1") {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const supabaseUserId = token?.supabaseUserId as string | undefined;

  // Routes d'API : seul le verrou de module. Hors module (le socle d'un
  // préfixe partagé, comme /api/feedback/[id]/key-points), rien à faire ; sans
  // utilisateur, la route répond elle-même 401.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (modulesForPath(request.nextUrl.pathname).length === 0) return NextResponse.next();
    const userId = await effectiveUserId(request, supabaseUserId);
    if (!userId) return NextResponse.next();
    const { modules } = await getUserGateInfo(userId);
    return blockingModuleForPath(request.nextUrl.pathname, modules) ? moduleNotFound(request) : NextResponse.next();
  }

  if (!supabaseUserId) {
    // Sans session, on renvoie vers la connexion en gardant la destination.
    // Avant, le middleware laissait passer et chaque page faisait son propre
    // `redirect("/login")` — une quinzaine de fois, sans jamais transmettre où
    // l'utilisateur allait. Résultat : un lien reçu par email et ouvert
    // déconnecté ramenait sur la page d'accueil de l'app, jamais sur le
    // feedback ou le devis demandé.
    //
    // Le matcher de ce fichier EST la liste des routes protégées : tout ce qui
    // arrive ici doit être gardé, `/demo` compris — ses écrans ne contiennent
    // que des données d'exemple, mais ils n'étaient liés que depuis
    // `/bienvenue` et la visite guidée, donc depuis l'application connectée.
    const url = request.nextUrl.clone();
    const destination = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("callbackUrl", destination);
    return NextResponse.redirect(url);
  }

  const gate = await getUserGateInfo(supabaseUserId);

  if (gate.disabled) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", "AccountDisabled");

    const response = NextResponse.redirect(url);
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    return response;
  }

  // /settings/billing stays reachable even blocked — otherwise a manager has
  // no way to update their payment method and unblock the organization.
  if (gate.billingBlocked && !request.nextUrl.pathname.startsWith("/settings/billing")) {
    const url = request.nextUrl.clone();
    url.pathname = "/compte-suspendu";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Page d'un module désactivé. Les gardes ci-dessus portent sur la session ;
  // les modules, sur l'utilisateur effectivement affiché (impersonation
  // comprise) — une seule requête de plus, et seulement dans ce cas.
  if (modulesForPath(request.nextUrl.pathname).length > 0) {
    const userId = await effectiveUserId(request, supabaseUserId);
    const modules = userId === supabaseUserId ? gate.modules : (await getUserGateInfo(userId!)).modules;
    if (blockingModuleForPath(request.nextUrl.pathname, modules)) return moduleNotFound(request);
  }

  return NextResponse.next();
}
