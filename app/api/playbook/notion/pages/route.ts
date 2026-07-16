import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getUserOrganizationId, getPlaybookNotionConnection } from "@/lib/db";
import { searchNotionPages } from "@/lib/notion";

export async function GET() {
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

  const connection = await getPlaybookNotionConnection(orgId);
  if (!connection) {
    return NextResponse.json({ error: "Notion non connecté." }, { status: 400 });
  }

  try {
    const pages = await searchNotionPages(connection.access_token);
    return NextResponse.json({ pages });
  } catch (err) {
    console.error("[playbook/notion/pages] search failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Impossible de lister les pages Notion." }, { status: 502 });
  }
}
