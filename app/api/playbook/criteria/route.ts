import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserRole, getUserOrganizationId, createPlaybookCriterion } from "@/lib/db";

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

  let body: { dimensionId?: string; question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!body.dimensionId || !body.question || !body.question.trim()) {
    return NextResponse.json({ error: "dimensionId et question requis." }, { status: 400 });
  }

  try {
    // createPlaybookCriterion re-derives the dimension's playbook and checks
    // it belongs to orgId before inserting anything.
    const id = await createPlaybookCriterion(body.dimensionId, orgId, body.question.trim());
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[playbook/criteria] createPlaybookCriterion failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de la création.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
