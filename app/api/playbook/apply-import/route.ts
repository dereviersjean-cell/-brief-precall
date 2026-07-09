import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import {
  getUserRole,
  getUserOrganizationId,
  getPlaybookForOrganization,
  replacePlaybookDimensions,
  type PlaybookDimensionReplacementInput,
} from "@/lib/db";

type RawDimension = { label?: string; description?: string; weight?: number; criteria?: string[] };

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

  let body: { dimensions?: RawDimension[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const dimensions: PlaybookDimensionReplacementInput[] = (body.dimensions ?? [])
    .filter((d): d is RawDimension & { label: string } => Boolean(d.label && d.label.trim()))
    .map((d) => ({
      label: d.label.trim(),
      description: d.description?.trim() || null,
      weight: typeof d.weight === "number" && d.weight >= 1 ? d.weight : 1,
      criteria: (d.criteria ?? []).map((q) => q.trim()).filter(Boolean),
    }));

  if (dimensions.length === 0) {
    return NextResponse.json({ error: "Aucune dimension valide à appliquer." }, { status: 400 });
  }

  try {
    // playbook.id was resolved from orgId above (never from the client), and
    // replacePlaybookDimensions re-verifies it belongs to orgId regardless.
    const updated = await replacePlaybookDimensions(playbook.id, orgId, dimensions);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[playbook/apply-import] replacePlaybookDimensions failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de l'application.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
