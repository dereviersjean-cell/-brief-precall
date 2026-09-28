import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { APP_URL } from "@/lib/app-url";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const clientId = process.env.RECALL_MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "RECALL_MICROSOFT_CLIENT_ID is not set." }, { status: 500 });
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();

  // Où revenir après la connexion — même mécanique et même validation que
  // la route Google (app/api/recall/google-oauth/start) : l'onboarding doit
  // reprendre son fil au lieu d'éjecter l'utilisateur dans les paramètres.
  // Seuls les chemins relatifs passent, sinon redirection ouverte.
  const requested = request.nextUrl.searchParams.get("return") ?? "";
  const safeReturn = /^\/(?!\/)[\w\-/?=&.]*$/.test(requested) && !requested.includes("..") ? requested : "";
  if (safeReturn) {
    cookieStore.set("recall_oauth_return", safeReturn, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
  }
  cookieStore.set("recall_ms_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 600,
    sameSite: "lax",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: `${APP_URL}/api/recall/microsoft-oauth/callback`,
    response_mode: "query",
    scope: "offline_access openid email https://graph.microsoft.com/Calendars.Read",
    state,
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
  );
}
