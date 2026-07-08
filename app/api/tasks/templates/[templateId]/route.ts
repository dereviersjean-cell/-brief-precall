import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { updateTaskTemplate, deleteTaskTemplate, type TaskTemplateInput } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { templateId } = await params;

  let body: Partial<TaskTemplateInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  try {
    await updateTaskTemplate(templateId, auth.userId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[tasks/templates/:id] updateTaskTemplate failed:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { templateId } = await params;

  try {
    await deleteTaskTemplate(templateId, auth.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[tasks/templates/:id] deleteTaskTemplate failed:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}
