import { NextRequest, NextResponse } from "next/server";
import { rejectQuoteByPublicToken } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let reason: string | null = null;
  try {
    const body = (await request.json()) as { reason?: unknown };
    reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
  } catch {
    // No body / invalid JSON — reason stays optional.
  }

  const result = await rejectQuoteByPublicToken(token, reason);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
