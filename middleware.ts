import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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
  ],
};

// Raw REST call rather than the full supabase-js client / lib/db.ts — keeps
// the middleware bundle minimal and avoids pulling in unrelated dependencies
// (embeddings, Anthropic SDK, etc.) into the edge runtime.
// Billing status is embedded in the same query (organizations via the FK on
// organization_id) rather than a second round-trip.
async function getUserGateInfo(userId: string): Promise<{ disabled: boolean; billingBlocked: boolean }> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=disabled_at,organizations(billing_status)`;
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
    if (!res.ok) return { disabled: false, billingBlocked: false };
    const rows = (await res.json()) as { disabled_at: string | null; organizations: { billing_status: string } | null }[];
    const row = rows[0];
    // "canceled" bloque au même titre que "blocked" — une résiliation coupe
    // l'accès immédiatement, pas de période de grâce (celle-ci ne s'applique
    // qu'aux échecs de paiement, cf. invoice.payment_failed dans le webhook).
    const status = row?.organizations?.billing_status;
    return {
      disabled: row?.disabled_at != null,
      billingBlocked: status === "blocked" || status === "canceled",
    };
  } catch {
    return { disabled: false, billingBlocked: false };
  }
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const supabaseUserId = token?.supabaseUserId as string | undefined;

  if (!supabaseUserId) {
    return NextResponse.next();
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

  return NextResponse.next();
}
