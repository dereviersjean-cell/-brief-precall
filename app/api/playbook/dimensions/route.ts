import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import {
  getUserRole,
  getUserOrganizationId,
  getPlaybookForOrganization,
  createPlaybookDimension,
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

  let body: { key?: string; label?: string; description?: string | null; weight?: number; sort_order?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!body.label || !body.label.trim()) {
    return NextResponse.json({ error: "label requis." }, { status: 400 });
  }

  try {
    // playbook.id was resolved from orgId above (never from the client), and
    // createPlaybookDimension re-verifies it belongs to orgId regardless.
    const id = await createPlaybookDimension(playbook.id, orgId, {
      key: body.key,
      label: body.label.trim(),
      description: body.description ?? null,
      weight: body.weight,
      sort_order: body.sort_order,
    });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[playbook/dimensions] createPlaybookDimension failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
