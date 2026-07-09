import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getUserOrganizationId, updatePlaybookDimension, deletePlaybookDimension } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ dimensionId: string }> }) {
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

  const { dimensionId } = await params;

  let body: { key?: string; label?: string; description?: string | null; weight?: number; sort_order?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  try {
    // updatePlaybookDimension re-derives the dimension's playbook and checks
    // it belongs to orgId before touching anything — dimensionId alone (from
    // the URL) is never trusted.
    await updatePlaybookDimension(dimensionId, orgId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[playbook/dimensions/:id] updatePlaybookDimension failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ dimensionId: string }> }) {
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

  const { dimensionId } = await params;

  try {
    await deletePlaybookDimension(dimensionId, orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[playbook/dimensions/:id] deletePlaybookDimension failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
