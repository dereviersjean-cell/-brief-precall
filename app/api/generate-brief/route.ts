import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { readConfig } from "@/lib/admin-config";
import { generateBrief } from "@/lib/brief-generator";
import { enrichWithPappers } from "@/lib/pappers";
import { fetchRecentNews } from "@/lib/news";
import { getBriefByEventId, saveBrief, getUserProfile } from "@/lib/db";
import { checkRateLimit, retryAfterMinutes } from "@/lib/rate-limit";

const DOMAIN_TLDS = /\.(com|fr|ai|io|co|net|org|eu|be|app|tech|dev|uk|de|es|it|nl|ch|ca|au|me|biz|info|saas)$/i;

function cleanCompanyName(name: string): string {
  return name
    .trim()
    .replace(DOMAIN_TLDS, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function POST(request: NextRequest) {
  let company: string;
  let calendarEventId: string | null = null;
  let contactEmail: string | null = null;

  try {
    const body = await request.json();
    company = body?.company;
    calendarEventId = body?.calendarEventId ?? null;
    contactEmail = body?.contactEmail ?? null;
  } catch {
    return NextResponse.json({ error: "Corps de la requête invalide." }, { status: 400 });
  }

  if (!company || typeof company !== "string" || company.trim().length === 0) {
    return NextResponse.json({ error: "Le paramètre 'company' est requis." }, { status: 400 });
  }

  const trimmed = cleanCompanyName(company);

  let userId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    userId = session?.supabaseUserId ?? null;
  } catch {
    // Session non disponible — on continue sans cache ni persistance
  }

  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = checkRateLimit(ip, userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    const scopeMsg =
      rl.scope === "user"
        ? `Vous avez atteint votre limite de briefs pour aujourd'hui. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`
        : rl.scope === "ip"
        ? `Trop de briefs générés depuis votre adresse. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`
        : `Le service est temporairement saturé. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
    return NextResponse.json(
      { error: scopeMsg, retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  // Cache : retourner le brief existant sans rappeler le modèle
  if (userId && calendarEventId) {
    try {
      const cached = await getBriefByEventId(userId, calendarEventId);
      if (cached?.content) {
        return NextResponse.json(cached.content);
      }
    } catch (err) {
      console.error("[generate-brief] Cache lookup failed:", err);
    }
  }

  // Récupérer le profil utilisateur pour personnaliser le prompt
  let userContext = null;
  if (userId) {
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        userContext = {
          product_description: profile.product_description,
          icp: profile.icp,
          sector: profile.sector,
        };
      }
    } catch (err) {
      console.error("[generate-brief] getUserProfile failed:", err);
    }
  }

  const config = await readConfig();

  try {
    const contactDomain = contactEmail ? (contactEmail.split("@")[1] ?? null) : null;

    const [pappersData, newsArticles] = await Promise.all([
      enrichWithPappers(trimmed),
      fetchRecentNews(trimmed, contactDomain),
    ]);

    const brief = await generateBrief(trimmed, config, userContext, pappersData, newsArticles, userId ?? undefined);

    if (userId) {
      saveBrief(userId, trimmed, contactEmail, calendarEventId, brief, config.model).catch(
        (err) => console.error("[generate-brief] saveBrief failed:", err)
      );
    }

    return NextResponse.json(brief);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Clé API invalide. Vérifiez ANTHROPIC_API_KEY dans .env.local." },
        { status: 401 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Limite de l'API atteinte. Réessayez dans quelques secondes." },
        { status: 429 }
      );
    }
    const message = err instanceof Error ? err.message : "Erreur interne du serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
