import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createRecallCalendarV2Microsoft } from "@/lib/recall";
import { saveRecallCalendarId } from "@/lib/db";

const SUCCESS_URL = "https://brief-precall.vercel.app/settings?recall=connected";
const ERROR_URL = "https://brief-precall.vercel.app/settings?recall=error";
const REDIRECT_URI = "https://brief-precall.vercel.app/api/recall/microsoft-oauth/callback";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const stateParam = request.nextUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("recall_ms_oauth_state")?.value;

  if (!stateCookie || stateParam !== stateCookie) {
    console.log("[ms oauth callback] State mismatch — possible CSRF");
    cookieStore.delete("recall_ms_oauth_state");
    return NextResponse.redirect(ERROR_URL);
  }

  cookieStore.delete("recall_ms_oauth_state");

  if (error) {
    console.log("[ms oauth callback] Microsoft returned error:", error);
    return NextResponse.redirect(ERROR_URL);
  }

  if (!code) {
    console.log("[ms oauth callback] No code in query params");
    return NextResponse.redirect(ERROR_URL);
  }

  // Step 1 — exchange code for tokens
  let refreshToken: string;
  try {
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.RECALL_MICROSOFT_CLIENT_ID!,
        client_secret: process.env.RECALL_MICROSOFT_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json() as Record<string, unknown>;
    console.log("[ms oauth callback] Token exchange status:", tokenRes.status);

    if (!tokenRes.ok) {
      console.log("[ms oauth callback] Token exchange failed:", tokenData.error, tokenData.error_description);
      return NextResponse.redirect(ERROR_URL);
    }

    if (!tokenData.refresh_token) {
      console.log("[ms oauth callback] No refresh_token in response");
      return NextResponse.redirect(ERROR_URL);
    }

    refreshToken = tokenData.refresh_token as string;
    console.log("[ms oauth callback] refresh_token obtained (length:", refreshToken.length, ")");
  } catch (err) {
    console.log("[ms oauth callback] Token exchange threw:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }

  // Step 2 — get authenticated user
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;

  if (!userId) {
    console.log("[ms oauth callback] No authenticated user session");
    return NextResponse.redirect(ERROR_URL);
  }

  // Step 3 — create Recall calendar
  try {
    const calendar = await createRecallCalendarV2Microsoft(userId, refreshToken);
    console.log("[ms oauth callback] Calendar created, id:", calendar.id);
    await saveRecallCalendarId(userId, calendar.id);
    console.log("[ms oauth callback] recall_calendar_id saved to DB");
    return NextResponse.redirect(SUCCESS_URL);
  } catch (err) {
    console.log("[ms oauth callback] createRecallCalendarV2Microsoft failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }
}
