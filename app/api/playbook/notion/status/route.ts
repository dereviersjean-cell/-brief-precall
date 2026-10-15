import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { getPlaybookNotionConnection } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;

  const orgId = auth.organizationId;
  if (!orgId) return NextResponse.json({ connected: false });

  const connection = await getPlaybookNotionConnection(orgId);
  return NextResponse.json({ connected: connection !== null });
}
