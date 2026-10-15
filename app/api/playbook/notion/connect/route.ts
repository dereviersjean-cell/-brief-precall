import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { savePlaybookNotionConnection } from "@/lib/db";
import { validateNotionToken } from "@/lib/notion";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;

  const role = auth.role;
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const orgId = auth.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  let token: string;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (typeof token !== "string" || !token.trim()) {
    return NextResponse.json({ error: "Token requis." }, { status: 400 });
  }

  const valid = await validateNotionToken(token.trim());
  if (!valid) {
    return NextResponse.json({ error: "Token Notion invalide." }, { status: 400 });
  }

  await savePlaybookNotionConnection(orgId, token.trim(), auth.userId);
  return NextResponse.json({ ok: true });
}
