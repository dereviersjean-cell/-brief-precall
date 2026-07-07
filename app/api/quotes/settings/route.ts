import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getQuoteSettings, upsertQuoteSettings, type QuoteSettingsInput } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const settings = await getQuoteSettings(auth.userId);
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  let body: QuoteSettingsInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  try {
    await upsertQuoteSettings(auth.userId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quotes/settings] upsertQuoteSettings failed:", err);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement." }, { status: 500 });
  }
}
