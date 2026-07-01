import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { exchangeHubspotCode } from "@/lib/crm/hubspot";
import { saveCrmTokens } from "@/lib/db";

const SUCCESS_URL = "https://brief-precall.vercel.app/settings?crm=hubspot_connected";
const ERROR_URL = "https://brief-precall.vercel.app/settings?crm=error";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const stateParam = request.nextUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("hubspot_oauth_state")?.value;

  if (!stateCookie || stateParam !== stateCookie) {
    console.log("[hubspot callback] State mismatch — possible CSRF");
    return NextResponse.redirect(ERROR_URL);
  }

  cookieStore.delete("hubspot_oauth_state");

  if (error) {
    console.log("[hubspot callback] HubSpot returned error:", error);
    return NextResponse.redirect(ERROR_URL);
  }

  if (!code) {
    console.log("[hubspot callback] No code in query params");
    return NextResponse.redirect(ERROR_URL);
  }

  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    console.log("[hubspot callback] No authenticated user session");
    return NextResponse.redirect(ERROR_URL);
  }

  let tokens: Awaited<ReturnType<typeof exchangeHubspotCode>>;
  try {
    tokens = await exchangeHubspotCode(code);
    console.log("[hubspot callback] Tokens obtained");
  } catch (err) {
    console.log("[hubspot callback] exchangeHubspotCode failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }

  try {
    await saveCrmTokens(userId, "hubspot", tokens.access_token, tokens.refresh_token);
    console.log("[hubspot callback] Tokens saved for userId:", userId);
    return NextResponse.redirect(SUCCESS_URL);
  } catch (err) {
    console.log("[hubspot callback] saveCrmTokens failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }
}
