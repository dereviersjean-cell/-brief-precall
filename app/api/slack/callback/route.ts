import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { exchangeSlackCode, saveSlackConnection } from "@/lib/slack";
import { APP_URL } from "@/lib/app-url";

const SUCCESS_URL = `${APP_URL}/settings/connexions?slack=connected`;
const ERROR_URL = `${APP_URL}/settings/connexions?slack=error`;

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const stateParam = request.nextUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("slack_oauth_state")?.value;

  if (!stateCookie || stateParam !== stateCookie) {
    console.log("[slack callback] State mismatch — possible CSRF");
    return NextResponse.redirect(ERROR_URL);
  }

  cookieStore.delete("slack_oauth_state");

  if (error) {
    console.log("[slack callback] Slack returned error:", error);
    return NextResponse.redirect(ERROR_URL);
  }

  if (!code) {
    console.log("[slack callback] No code in query params");
    return NextResponse.redirect(ERROR_URL);
  }

  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) {
    console.log("[slack callback] No authenticated (or disabled) user session");
    return NextResponse.redirect(ERROR_URL);
  }
  const userId = auth.userId;

  let tokens: Awaited<ReturnType<typeof exchangeSlackCode>>;
  try {
    tokens = await exchangeSlackCode(code);
    console.log("[slack callback] Tokens obtained");
  } catch (err) {
    console.log("[slack callback] exchangeSlackCode failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }

  try {
    await saveSlackConnection(userId, tokens);
    console.log("[slack callback] Connection saved for userId:", userId);
    return NextResponse.redirect(SUCCESS_URL);
  } catch (err) {
    console.log("[slack callback] saveSlackConnection failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }
}
