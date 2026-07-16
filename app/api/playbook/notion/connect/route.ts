import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getUserOrganizationId, savePlaybookNotionConnection } from "@/lib/db";
import { validateNotionToken } from "@/lib/notion";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const orgId = await getUserOrganizationId(auth.userId);
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
