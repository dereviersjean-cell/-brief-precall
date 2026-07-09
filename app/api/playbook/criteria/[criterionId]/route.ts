import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getUserOrganizationId, updatePlaybookCriterion, deletePlaybookCriterion } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ criterionId: string }> }) {
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

  const { criterionId } = await params;

  let body: { question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!body.question || !body.question.trim()) {
    return NextResponse.json({ error: "question requis." }, { status: 400 });
  }

  try {
    await updatePlaybookCriterion(criterionId, orgId, body.question.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[playbook/criteria/:id] updatePlaybookCriterion failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ criterionId: string }> }) {
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

  const { criterionId } = await params;

  try {
    await deletePlaybookCriterion(criterionId, orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[playbook/criteria/:id] deletePlaybookCriterion failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
