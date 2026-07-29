import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getUserOrganizationId, updateObjectionCategory, deleteObjectionCategory } from "@/lib/db";

// Toutes les mutations passent l'organizationId du manager connecté en plus
// de l'id de la catégorie : un id valide d'une autre organisation ne mute
// rien (le WHERE côté db.ts porte sur les deux).
async function authorize(): Promise<{ ok: true; orgId: string } | { ok: false; response: NextResponse }> {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return { ok: false, response: auth.response };

  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return { ok: false, response: NextResponse.json({ error: "Réservé aux managers." }, { status: 403 }) };
  }

  const orgId = await getUserOrganizationId(auth.userId);
  if (!orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 }),
    };
  }
  return { ok: true, orgId };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;
  const { categoryId } = await params;

  let body: {
    label?: string;
    description?: string;
    handlingGuidance?: string;
    examplePhrasings?: string[];
    position?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (body.label !== undefined && !body.label.trim()) {
    return NextResponse.json({ error: "Le nom de l'objection ne peut pas être vide." }, { status: 400 });
  }

  try {
    const category = await updateObjectionCategory(auth.orgId, categoryId, {
      ...(body.label !== undefined ? { label: body.label } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.handlingGuidance !== undefined ? { handlingGuidance: body.handlingGuidance } : {}),
      ...(body.examplePhrasings !== undefined
        ? { examplePhrasings: body.examplePhrasings.map((p) => String(p).trim()).filter(Boolean) }
        : {}),
      ...(body.position !== undefined ? { position: body.position } : {}),
    });
    if (!category) return NextResponse.json({ error: "Objection introuvable." }, { status: 404 });
    return NextResponse.json({ category });
  } catch (err) {
    console.error("[objections/categories] updateObjectionCategory failed:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ categoryId: string }> }) {
  const auth = await authorize();
  if (!auth.ok) return auth.response;
  const { categoryId } = await params;

  try {
    // Les objections déjà rattachées ne sont pas supprimées : la FK est en
    // `on delete set null`, elles repassent en « Non classées ».
    await deleteObjectionCategory(auth.orgId, categoryId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[objections/categories] deleteObjectionCategory failed:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}
