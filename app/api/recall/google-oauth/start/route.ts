import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const clientId = process.env.RECALL_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "RECALL_GOOGLE_CLIENT_ID is not set." }, { status: 500 });
  }

  const state = randomBytes(32).toString("hex");

  // Où revenir après la connexion. Par défaut /settings/connexions, mais
  // l'onboarding a besoin de reprendre son fil plutôt que d'éjecter
  // l'utilisateur dans les paramètres au milieu du parcours.
  //
  // SEULS les chemins relatifs sont acceptés : un `return` absolu ou
  // protocole-relatif (« //evil.com ») transformerait cette route en redirection
  // ouverte, utilisable pour de l'hameçonnage depuis un lien qui semble venir
  // de Brief.
  const requested = request.nextUrl.searchParams.get("return") ?? "";
  const safeReturn = /^\/(?!\/)[\w\-/?=&.]*$/.test(requested) && !requested.includes("..") ? requested : "";
  const cookieStore = await cookies();
  if (safeReturn) {
    cookieStore.set("recall_oauth_return", safeReturn, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
  }
  cookieStore.set("recall_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 600,
    sameSite: "lax",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: "https://brief-precall.vercel.app/api/recall/google-oauth/callback",
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/userinfo.email",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
