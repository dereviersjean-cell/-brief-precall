import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readConfig } from "@/lib/admin-config";
import { generateBrief, UserContext } from "@/lib/brief-generator";
import { enrichWithPappers } from "@/lib/pappers";
import { fetchRecentNews, type NewsArticle } from "@/lib/news";
import { findSimilarReferences, type SimilarReference } from "@/lib/embeddings";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let company: string;
  let userContext: UserContext = null;
  let includeNews = false;

  try {
    ({ company, userContext = null, includeNews = false } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!company?.trim()) {
    return NextResponse.json({ error: "Le paramètre 'company' est requis." }, { status: 400 });
  }

  const trimmed = company.trim();
  const config = await readConfig();
  const adminUserId = process.env.ADMIN_TEST_USER_ID ?? null;

  try {
    const [pappersData, newsArticles, similarRefs] = await Promise.all([
      enrichWithPappers(trimmed),
      includeNews ? fetchRecentNews(trimmed) : Promise.resolve([] as NewsArticle[]),
      adminUserId
        ? findSimilarReferences(adminUserId, trimmed).catch(() => [] as SimilarReference[])
        : Promise.resolve([] as SimilarReference[]),
    ]);

    const brief = await generateBrief(
      trimmed,
      config,
      userContext,
      pappersData,
      newsArticles.length > 0 ? newsArticles : undefined,
      adminUserId ?? undefined
    );

    return NextResponse.json({
      brief,
      reasoning: {
        crm_data: null,
        pappers_data: pappersData,
        news_found: newsArticles.length,
        references_used: similarRefs.map((r) => ({
          client_name: r.client_name,
          sector: r.sector,
          company_size: r.company_size,
          problem: r.problem,
          solution: r.solution,
          result: r.result,
          similarity: Math.round(r.similarity * 1000) / 1000,
        })),
        web_search_queries: [],
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Clé API invalide." }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Limite API atteinte." }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : "Erreur interne.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
