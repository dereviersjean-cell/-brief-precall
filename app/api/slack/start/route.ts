import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getSlackAuthUrl } from "@/lib/slack";

const ERROR_URL = "https://brief-precall.vercel.app/settings/connexions?slack=error";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) {
    return NextResponse.redirect(ERROR_URL);
  }

  if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
    return NextResponse.json({ error: "Slack credentials not configured." }, { status: 500 });
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 600,
    sameSite: "lax",
  });

  return NextResponse.redirect(getSlackAuthUrl(state));
}
