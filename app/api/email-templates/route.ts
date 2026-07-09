import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import {
  getUserRole,
  getUserOrganizationId,
  getEmailTemplatesForOrganization,
  ensureDefaultEmailTemplates,
  createEmailTemplate,
} from "@/lib/db";

// Open read for any active org member (commercial or manager) — sous-étape B
// consumes this to let a commercial pick a template when drafting an email.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const orgId = await getUserOrganizationId(auth.userId);
  if (!orgId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  // Fresh from DB, not the JWT — session.role can be stale until re-login.
  const role = await getUserRole(auth.userId);
  if (role === "manager") {
    const templates = await ensureDefaultEmailTemplates(orgId, auth.userId);
    return NextResponse.json(templates);
  }

  const templates = await getEmailTemplatesForOrganization(orgId);
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
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

  let body: { name?: string; description?: string | null; system_prompt?: string; sort_order?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!body.name || !body.name.trim() || !body.system_prompt || !body.system_prompt.trim()) {
    return NextResponse.json({ error: "name et system_prompt requis." }, { status: 400 });
  }

  try {
    const id = await createEmailTemplate(orgId, auth.userId, {
      name: body.name.trim(),
      description: body.description ?? null,
      system_prompt: body.system_prompt.trim(),
      sort_order: body.sort_order,
    });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[email-templates] createEmailTemplate failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
