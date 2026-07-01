import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { exchangePipedriveCode } from "@/lib/crm/pipedrive";
import { saveCrmTokens } from "@/lib/db";

const SUCCESS_URL = "https://brief-precall.vercel.app/settings?crm=pipedrive_connected";
const ERROR_URL = "https://brief-precall.vercel.app/settings?crm=error";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const stateParam = request.nextUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("pipedrive_oauth_state")?.value;

  if (!stateCookie || stateParam !== stateCookie) {
    console.log("[pipedrive callback] State mismatch — possible CSRF");
    return NextResponse.redirect(ERROR_URL);
  }

  cookieStore.delete("pipedrive_oauth_state");

  if (error) {
    console.log("[pipedrive callback] Pipedrive returned error:", error);
    return NextResponse.redirect(ERROR_URL);
  }

  if (!code) {
    console.log("[pipedrive callback] No code in query params");
    return NextResponse.redirect(ERROR_URL);
  }

  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;
  if (!userId) {
    console.log("[pipedrive callback] No authenticated user session");
    return NextResponse.redirect(ERROR_URL);
  }

  let tokens: Awaited<ReturnType<typeof exchangePipedriveCode>>;
  try {
    tokens = await exchangePipedriveCode(code);
    console.log("[pipedrive callback] Tokens obtained, api_domain:", tokens.api_domain);
  } catch (err) {
    console.log("[pipedrive callback] exchangePipedriveCode failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }

  try {
    await saveCrmTokens(userId, "pipedrive", tokens.access_token, tokens.refresh_token, tokens.api_domain);
    console.log("[pipedrive callback] Tokens saved to DB for userId:", userId);
    return NextResponse.redirect(SUCCESS_URL);
  } catch (err) {
    console.log("[pipedrive callback] saveCrmTokens failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }
}
