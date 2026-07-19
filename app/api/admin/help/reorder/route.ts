import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { reorderHelpArticles } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: { category?: string; orderedIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!body.category?.trim() || !Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
    return NextResponse.json({ error: "category et orderedIds requis." }, { status: 400 });
  }

  try {
    await reorderHelpArticles(body.category.trim(), body.orderedIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/help/reorder] reorderHelpArticles failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors du réordonnancement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
