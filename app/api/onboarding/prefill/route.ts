import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { enforceAiGenerationLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { generateOnboardingPrefill } from "@/lib/onboarding-prefill";
import { reportError } from "@/lib/monitoring";

// Recherche web + réponse : une vingtaine de secondes en général.
export const maxDuration = 60;

// Proposition de profil à l'inscription (lib/onboarding-prefill.ts). Session
// obligatoire : elle n'existe qu'après la vérification de l'adresse par code.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as { companyName?: unknown; website?: unknown } | null;
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim().slice(0, 200) : "";
  if (!companyName) return NextResponse.json({ error: "Indiquez le nom de votre entreprise." }, { status: 400 });
  // Un domaine, pas une URL : rien d'autre ne part vers le modèle.
  const rawWebsite = typeof body?.website === "string" ? body.website.trim().toLowerCase() : "";
  const website = rawWebsite.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const validWebsite = /^[a-z0-9.-]+\.[a-z]{2,}$/.test(website) ? website : null;

  const limit = await enforceAiGenerationLimit(requestIp(request), auth.userId);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Trop de demandes. Réessayez dans ${retryAfterMinutes(limit.retryAfterMs)} min.` },
      { status: 429 }
    );
  }

  try {
    const prefill = await generateOnboardingPrefill({ companyName, website: validWebsite });
    return NextResponse.json(prefill);
  } catch (err) {
    reportError("onboarding.prefill", err, { companyName });
    // L'onboarding continue à la main : on ne bloque jamais l'inscription.
    return NextResponse.json({ found: false, source: null, whatYouSell: "", icp: "", sector: "", valueProposition: "" });
  }
}
