import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateOrganizationName, deleteOrganization } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orgId } = await params;
  const { name } = (await request.json()) as { name?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  }

  await updateOrganizationName(orgId, name.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orgId } = await params;
  try {
    await deleteOrganization(orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
