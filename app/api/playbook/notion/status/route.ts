import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserOrganizationId, getPlaybookNotionConnection } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const orgId = await getUserOrganizationId(auth.userId);
  if (!orgId) return NextResponse.json({ connected: false });

  const connection = await getPlaybookNotionConnection(orgId);
  return NextResponse.json({ connected: connection !== null });
}
