import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import {
  getUserRole,
  getUserOrganizationId,
  getPlaybookForOrganization,
  reorderPlaybookDimensions,
} from "@/lib/db";

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

  const playbook = await getPlaybookForOrganization(orgId);
  if (!playbook) {
    return NextResponse.json({ error: "Aucun playbook trouvé." }, { status: 404 });
  }

  let body: { orderedIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds requis." }, { status: 400 });
  }

  try {
    // reorderPlaybookDimensions checks every id in orderedIds actually
    // belongs to this playbook_id (itself already org-verified).
    await reorderPlaybookDimensions(playbook.id, orgId, body.orderedIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[playbook/dimensions/reorder] reorderPlaybookDimensions failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors du réordonnancement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
