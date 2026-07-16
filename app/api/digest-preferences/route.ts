import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getDigestPreference, setDigestPreference, type DigestTiming } from "@/lib/db";

const VALID_TIMINGS: DigestTiming[] = ["friday_evening", "monday_morning"];

// Strictly per-user, same convention as notification-preferences/route.ts —
// auth.userId from the session, never the request body.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const preference = await getDigestPreference(auth.userId);
  return NextResponse.json(preference);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  let body: { enabled?: unknown; timing?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const { enabled, timing } = body;
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled doit être un booléen." }, { status: 400 });
  }
  if (!timing || !VALID_TIMINGS.includes(timing as DigestTiming)) {
    return NextResponse.json({ error: "timing invalide." }, { status: 400 });
  }

  await setDigestPreference(auth.userId, enabled, timing as DigestTiming);
  return NextResponse.json({ enabled, timing });
}
