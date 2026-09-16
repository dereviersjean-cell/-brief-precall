import { NextRequest, NextResponse } from "next/server";
import { generateAdminToken } from "@/lib/admin-auth";
import { enforceAdminLoginLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = await enforceAdminLoginLimit(requestIp(request));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${retryAfterMinutes(rl.retryAfterMs)} minutes.` },
      { status: 429 }
    );
  }

  let password: string;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin_session", generateAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
