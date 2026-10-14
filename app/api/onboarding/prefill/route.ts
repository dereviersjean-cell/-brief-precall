import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { enforceAiGenerationLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { generateOnboardingPrefill } from "@/lib/onboarding-prefill";
import { findCompanyHost } from "@/lib/company-logo-resolver";
import { lookupCompanyRegistry } from "@/lib/company-registry";
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
    // Le site d'abord : sans lui, l'IA ne trouvait parfois que les registres,
    // dont le code d'activité trompe (Arvest Wine, plateforme de données sur le
    // vin, immatriculée « commerce de gros de boissons »). Même recherche que
    // pour les logos ; domaine retenu seulement s'il porte le nom.
    const [foundHost, registry] = await Promise.all([
      validWebsite ? Promise.resolve(validWebsite) : findCompanyHost(companyName, []).catch(() => null),
      lookupCompanyRegistry(companyName).catch(() => null),
    ]);
    const registryHint = registry
      ? [registry.foundedOn ? `créée le ${registry.foundedOn}` : null, registry.leader ? `dirigeant : ${registry.leader} (${registry.leaderRole ?? ""})` : null]
          .filter(Boolean)
          .join(", ")
      : null;
    const prefill = await generateOnboardingPrefill({ companyName, website: foundHost, registryHint });
    // Le site retenu revient à l'écran : c'est lui que cite le bandeau
    // « Proposé par Brief d'après … », et qui donne le logo de la fiche.
    // Seulement si l'entreprise est confirmée : la recherche peut associer un
    // site sans rapport (« … Quimper » → tech-quimper.bzh), que l'IA écarte.
    return NextResponse.json({ ...prefill, website: prefill.found && prefill.source === "web" ? foundHost : null });
  } catch (err) {
    reportError("onboarding.prefill", err, { companyName });
    // L'onboarding continue à la main : on ne bloque jamais l'inscription.
    return NextResponse.json({ found: false, source: null, whatYouSell: "", icp: "", sector: "", valueProposition: "" });
  }
}
