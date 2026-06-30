import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.supabaseUserId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const clientId = process.env.RECALL_MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "RECALL_MICROSOFT_CLIENT_ID is not set." }, { status: 500 });
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("recall_ms_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 600,
    sameSite: "lax",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: "https://brief-precall.vercel.app/api/recall/microsoft-oauth/callback",
    response_mode: "query",
    scope: "offline_access openid email https://graph.microsoft.com/Calendars.Read",
    state,
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
  );
}
