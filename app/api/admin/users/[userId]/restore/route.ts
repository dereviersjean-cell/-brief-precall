import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { restoreUser } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { userId } = await params;
  await restoreUser(userId);
  return NextResponse.json({ ok: true });
}
