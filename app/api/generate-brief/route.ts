import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { readConfig } from "@/lib/admin-config";
import { generateBrief } from "@/lib/brief-generator";
import { getBriefByEventId, saveBrief, getUserProfile } from "@/lib/db";

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

  const trimmed = company.trim();

  let userId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    userId = session?.supabaseUserId ?? null;
  } catch {
    // Session non disponible — on continue sans cache ni persistance
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
    const brief = await generateBrief(trimmed, config, userContext);

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
