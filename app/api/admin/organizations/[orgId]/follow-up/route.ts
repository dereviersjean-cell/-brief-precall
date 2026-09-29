import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateClientFollowUp, type ClientFollowUpPatch } from "@/lib/clients-overview";

// Suivi d'un client par l'account manager (migration 020) : qui le suit, le
// prochain point, le début du parcours. Seuls les champs envoyés changent ;
// une chaîne vide les efface.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const { orgId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const patch: ClientFollowUpPatch = {};
  if ("account_manager" in body) {
    const value = typeof body.account_manager === "string" ? body.account_manager.trim() : "";
    patch.account_manager = value || null;
  }
  if ("next_review_at" in body) {
    const value = typeof body.next_review_at === "string" ? body.next_review_at : "";
    if (value && Number.isNaN(new Date(value).getTime())) {
      return NextResponse.json({ error: "Date du prochain point invalide." }, { status: 400 });
    }
    patch.next_review_at = value ? new Date(value).toISOString() : null;
  }
  if ("parcours_started_at" in body) {
    const value = typeof body.parcours_started_at === "string" ? body.parcours_started_at : "";
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return NextResponse.json({ error: "Date de début invalide." }, { status: 400 });
    }
    patch.parcours_started_at = value || null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Aucun champ à modifier." }, { status: 400 });
  }

  try {
    await updateClientFollowUp(orgId, patch);
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "42703" || code === "PGRST204") {
      return NextResponse.json({ error: "La migration 020 (suivi client) n'est pas encore passée sur Supabase." }, { status: 409 });
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
