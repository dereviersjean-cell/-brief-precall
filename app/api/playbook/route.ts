import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import {
  getPlaybookForOrganization,
  ensureDefaultPlaybookForOrganization,
  updatePlaybookName,
} from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;

  // Fresh from DB, not the JWT — session.role can be stale until re-login.
  const role = auth.role;
  const orgId = auth.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  if (role === "manager") {
    const playbook = await ensureDefaultPlaybookForOrganization(orgId, auth.userId);
    return NextResponse.json(playbook);
  }

  const playbook = await getPlaybookForOrganization(orgId);
  if (!playbook) {
    return NextResponse.json({ error: "Aucun playbook configuré pour votre organisation." }, { status: 404 });
  }
  return NextResponse.json(playbook);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;

  const role = auth.role;
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const orgId = auth.organizationId;
  if (!orgId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const playbook = await getPlaybookForOrganization(orgId);
  if (!playbook) {
    return NextResponse.json({ error: "Aucun playbook à modifier." }, { status: 404 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "name requis." }, { status: 400 });
  }

  try {
    // orgId is re-derived above from the authenticated user, never from the
    // request body — updatePlaybookName itself also filters by organization_id.
    await updatePlaybookName(playbook.id, orgId, body.name.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[playbook] updatePlaybookName failed:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
  }
}
