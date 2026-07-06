import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/brief/:path*",
    "/feedback/:path*",
    "/contacts/:path*",
    "/settings/:path*",
    "/team/:path*",
    "/onboarding/:path*",
  ],
};

// Raw REST call rather than the full supabase-js client / lib/db.ts — keeps
// the middleware bundle minimal and avoids pulling in unrelated dependencies
// (embeddings, Anthropic SDK, etc.) into the edge runtime.
async function isUserDisabled(userId: string): Promise<boolean> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=disabled_at`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    // Fail open on infra errors — this is an admin-controlled soft-disable
    // gate, not the primary auth boundary, so a Supabase hiccup shouldn't
    // lock everyone out.
    if (!res.ok) return false;
    const rows = (await res.json()) as { disabled_at: string | null }[];
    return rows[0]?.disabled_at != null;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const supabaseUserId = token?.supabaseUserId as string | undefined;

  if (!supabaseUserId) {
    return NextResponse.next();
  }

  if (await isUserDisabled(supabaseUserId)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", "AccountDisabled");

    const response = NextResponse.redirect(url);
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    return response;
  }

  return NextResponse.next();
}
