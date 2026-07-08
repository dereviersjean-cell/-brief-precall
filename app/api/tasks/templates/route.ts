import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { listTaskTemplates, createTaskTemplate, type TaskTemplateInput } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const templates = await listTaskTemplates(auth.userId);
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  let body: TaskTemplateInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (
    !body.trigger_type ||
    !body.title ||
    !body.title.trim() ||
    !body.task_type ||
    !body.action_type ||
    typeof body.offset_hours !== "number"
  ) {
    return NextResponse.json(
      { error: "trigger_type, title, task_type, action_type et offset_hours requis." },
      { status: 400 }
    );
  }

  try {
    const id = await createTaskTemplate(auth.userId, body);
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[tasks/templates] createTaskTemplate failed:", err);
    return NextResponse.json({ error: "Erreur lors de la création." }, { status: 500 });
  }
}
