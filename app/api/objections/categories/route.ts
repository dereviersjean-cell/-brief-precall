import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import {
  getUserRole,
  getUserOrganizationId,
  listObjectionCategories,
  createObjectionCategory,
  reorderObjectionCategories,
} from "@/lib/db";

// Bibliothèque d'objections du manager : les objections qui reviennent le
// plus souvent et la manière de les traiter. Même modèle d'autorisation que
// /api/playbook/dimensions — lecture ouverte à toute l'organisation (le
// commercial doit pouvoir consulter la grille sur laquelle il est évalué),
// écriture réservée au manager.

export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const orgId = await getUserOrganizationId(auth.userId);
  if (!orgId) return NextResponse.json({ categories: [] });

  try {
    return NextResponse.json({ categories: await listObjectionCategories(orgId) });
  } catch (err) {
    // Migration 006 pas encore appliquée (pattern bug #14) — l'UI affiche
    // une bibliothèque vide plutôt qu'une erreur.
    console.error("[objections/categories] listObjectionCategories failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ categories: [] });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  // Relu en base, pas depuis le JWT — session.role peut avoir jusqu'à 10 min
  // de retard (bug #22).
  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const orgId = await getUserOrganizationId(auth.userId);
  if (!orgId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  let body: {
    label?: string;
    description?: string;
    handlingGuidance?: string;
    examplePhrasings?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!body.label?.trim()) {
    return NextResponse.json({ error: "Le nom de l'objection est requis." }, { status: 400 });
  }

  try {
    const category = await createObjectionCategory(orgId, {
      label: body.label,
      description: body.description,
      handlingGuidance: body.handlingGuidance,
      examplePhrasings: Array.isArray(body.examplePhrasings)
        ? body.examplePhrasings.map((p) => String(p).trim()).filter(Boolean)
        : [],
    });
    return NextResponse.json({ category });
  } catch (err) {
    console.error("[objections/categories] createObjectionCategory failed:", err);
    return NextResponse.json({ error: "Erreur lors de la création." }, { status: 500 });
  }
}

// Réordonnancement de la liste complète, en une requête.
export async function PATCH(request: NextRequest) {
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

  let body: { orderedIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!Array.isArray(body.orderedIds)) {
    return NextResponse.json({ error: "orderedIds requis." }, { status: 400 });
  }

  // reorderObjectionCategories filtre lui-même sur organization_id : un id
  // d'une autre organisation glissé dans la liste ne met rien à jour.
  await reorderObjectionCategories(orgId, body.orderedIds);
  return NextResponse.json({ ok: true });
}
