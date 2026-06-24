import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateRecallToken } from "@/lib/recall";

const REDIRECT_URI = "https://eu-central-1.recall.ai/api/v1/calendar/google_oauth_callback/";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const clientId = process.env.RECALL_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "RECALL_GOOGLE_CLIENT_ID is not set." }, { status: 500 });
  }

  let recallToken: string;
  try {
    const tokenData = await generateRecallToken(userId);
    recallToken = tokenData.token;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Recall token generation failed." },
      { status: 500 }
    );
  }

  const state = JSON.stringify({
    recall_calendar_auth_token: recallToken,
    google_oauth_redirect_url: REDIRECT_URI,
    success_url: "https://brief-precall.vercel.app/settings?recall=success",
    error_url: "https://brief-precall.vercel.app/settings?recall=error",
  });

  const params = new URLSearchParams({
    scope: "https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    state,
  });

  const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(googleOAuthUrl);
}
