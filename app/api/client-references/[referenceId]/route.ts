import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { deleteClientReference, getTeamReferenceOwner, updateClientReference } from "@/lib/db";
import { isUuid } from "@/lib/uuid";

type Props = { params: Promise<{ referenceId: string }> };

export async function PATCH(req: Request, { params }: Props) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { referenceId } = await params;
  const body = await req.json().catch(() => ({}));

  const toNullableString = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const patch: Record<string, string | null> = {};
  for (const field of ["client_name", "sector", "company_size", "problem", "solution", "result"] as const) {
    if (field in body) patch[field] = toNullableString(body[field]);
  }
  if (patch.client_name === null) {
    return NextResponse.json({ error: "Le nom du client est requis." }, { status: 400 });
  }

  // Une référence de l'équipe se corrige par n'importe lequel de ses membres.
  const owner = isUuid(referenceId) ? await getTeamReferenceOwner(auth.userId, referenceId) : null;
  if (!owner) return NextResponse.json({ error: "Référence introuvable." }, { status: 404 });
  const updated = await updateClientReference(owner, referenceId, patch);
  const { embedding, ...rest } = updated;
  return NextResponse.json({ ...rest, has_embedding: embedding != null });
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { referenceId } = await params;
  const owner = isUuid(referenceId) ? await getTeamReferenceOwner(auth.userId, referenceId) : null;
  if (!owner) return NextResponse.json({ error: "Référence introuvable." }, { status: 404 });
  await deleteClientReference(owner, referenceId);

  return NextResponse.json({ ok: true });
}
