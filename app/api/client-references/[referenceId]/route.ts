import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { deleteClientReference } from "@/lib/db";

type Props = { params: Promise<{ referenceId: string }> };

export async function DELETE(_req: Request, { params }: Props) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { referenceId } = await params;
  await deleteClientReference(auth.userId, referenceId);

  return NextResponse.json({ ok: true });
}
