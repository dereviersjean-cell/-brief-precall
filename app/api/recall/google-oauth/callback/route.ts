import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createRecallCalendarV2 } from "@/lib/recall";
import { saveRecallCalendarId } from "@/lib/db";

const SUCCESS_URL = "https://brief-precall.vercel.app/settings?recall=connected";
const ERROR_URL = "https://brief-precall.vercel.app/settings?recall=error";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    console.log("[recall oauth callback] Google returned error:", error);
    return NextResponse.redirect(ERROR_URL);
  }

  if (!code) {
    console.log("[recall oauth callback] No code in query params");
    return NextResponse.redirect(ERROR_URL);
  }

  console.log("[recall oauth callback] Received authorization code, exchanging for tokens...");

  // Step 1 — exchange code for tokens
  let refreshToken: string;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.RECALL_GOOGLE_CLIENT_ID!,
        client_secret: process.env.RECALL_GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: "https://brief-precall.vercel.app/api/recall/google-oauth/callback",
      }),
    });

    const tokenData = await tokenRes.json() as Record<string, unknown>;
    console.log("[recall oauth callback] Token exchange status:", tokenRes.status);

    if (!tokenRes.ok) {
      console.log("[recall oauth callback] Token exchange failed:", tokenData.error, tokenData.error_description);
      return NextResponse.redirect(ERROR_URL);
    }

    if (!tokenData.refresh_token) {
      console.log("[recall oauth callback] No refresh_token in response — user may have already granted consent");
      return NextResponse.redirect(ERROR_URL);
    }

    refreshToken = tokenData.refresh_token as string;
    console.log("[recall oauth callback] refresh_token obtained (length:", refreshToken.length, ")");
  } catch (err) {
    console.log("[recall oauth callback] Token exchange threw:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }

  // Step 2 — get authenticated user
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;

  if (!userId) {
    console.log("[recall oauth callback] No authenticated user session");
    return NextResponse.redirect(ERROR_URL);
  }

  console.log("[recall oauth callback] User authenticated, creating Recall calendar for userId:", userId);

  // Step 3 — create Recall calendar
  try {
    const calendar = await createRecallCalendarV2(userId, refreshToken);
    console.log("[recall oauth callback] Calendar created, id:", calendar.id);
    await saveRecallCalendarId(userId, calendar.id);
    console.log("[recall oauth callback] recall_calendar_id saved to DB");
    return NextResponse.redirect(SUCCESS_URL);
  } catch (err) {
    console.log("[recall oauth callback] createRecallCalendarV2 failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.redirect(ERROR_URL);
  }
}
