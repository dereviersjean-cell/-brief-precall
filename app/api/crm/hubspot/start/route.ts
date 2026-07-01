import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getHubspotAuthUrl } from "@/lib/crm/hubspot";

const ERROR_URL = "https://brief-precall.vercel.app/settings?crm=error";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.supabaseUserId) {
    return NextResponse.redirect(ERROR_URL);
  }

  if (!process.env.HUBSPOT_CLIENT_ID || !process.env.HUBSPOT_CLIENT_SECRET) {
    return NextResponse.json({ error: "HubSpot credentials not configured." }, { status: 500 });
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("hubspot_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 600,
    sameSite: "lax",
  });

  return NextResponse.redirect(getHubspotAuthUrl(state));
}
