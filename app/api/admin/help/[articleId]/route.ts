import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateHelpArticle, deleteHelpArticle, type HelpArticleVisibility } from "@/lib/db";

const VALID_VISIBILITY = new Set<HelpArticleVisibility>(["manager", "commercial", "both"]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ articleId: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const { articleId } = await params;

  let body: { category?: string; title?: string; content?: string; visible_to?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (body.visible_to !== undefined && !VALID_VISIBILITY.has(body.visible_to as HelpArticleVisibility)) {
    return NextResponse.json({ error: "visible_to invalide." }, { status: 400 });
  }

  try {
    await updateHelpArticle(articleId, {
      category: body.category,
      title: body.title,
      content: body.content,
      visible_to: body.visible_to as HelpArticleVisibility | undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/help/:id] updateHelpArticle failed:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ articleId: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const { articleId } = await params;

  try {
    await deleteHelpArticle(articleId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/help/:id] deleteHelpArticle failed:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 400 });
  }
}
