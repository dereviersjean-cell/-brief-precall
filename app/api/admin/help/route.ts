import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllHelpArticles, createHelpArticle, type HelpArticleVisibility } from "@/lib/db";

const VALID_VISIBILITY = new Set<HelpArticleVisibility>(["manager", "commercial", "both"]);

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const articles = await getAllHelpArticles();
  return NextResponse.json(articles);
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: { category?: string; title?: string; content?: string; visible_to?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!body.category?.trim() || !body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "category, title et content requis." }, { status: 400 });
  }
  const visibleTo = body.visible_to ?? "both";
  if (!VALID_VISIBILITY.has(visibleTo as HelpArticleVisibility)) {
    return NextResponse.json({ error: "visible_to invalide." }, { status: 400 });
  }

  try {
    const id = await createHelpArticle({
      category: body.category.trim(),
      title: body.title.trim(),
      content: body.content.trim(),
      visible_to: visibleTo as HelpArticleVisibility,
    });
    return NextResponse.json({ id });
  } catch (err) {
    console.error("[admin/help] createHelpArticle failed:", err);
    return NextResponse.json({ error: "Erreur lors de la création." }, { status: 400 });
  }
}
