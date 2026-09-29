import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GENERIC_EMAIL_DOMAINS } from "@/lib/company-domain";
import { isPublicHostname } from "@/lib/company-logo";
import { resolveCompanyLogo } from "@/lib/company-logo-resolver";

// Logo d'une entreprise, trouvé côté serveur (29/09/2026, demande de Jean :
// « se débrouiller pour trouver le logo »). Ordre :
//   1. le favicon du domaine de l'adresse email (Google, puis DuckDuckGo) ;
//   2. sinon, le vrai site de l'entreprise trouvé par une recherche web sur
//      son nom (martin.namy@scutum.com n'a pas de site, « Scutum » → scutum-group.com),
//      à condition que le site porte le nom de l'entreprise — jamais le logo
//      d'une autre société ;
//   3. sinon 404, et le composant affiche l'initiale.
// Réponse = redirection vers l'image, mise en cache par le CDN : une
// recherche par entreprise, pas une par affichage. Le domaine du prospect ne
// transite plus par Google depuis le navigateur de l'utilisateur.

const FOUND_CACHE = "public, max-age=86400, s-maxage=2592000";
const MISSING_CACHE = "public, max-age=3600, s-maxage=604800";

// Cache de l'instance, en plus du CDN.
const memo = new Map<string, string | null>();

export async function GET(request: NextRequest) {
  // Réservé aux utilisateurs connectés : la route déclenche des recherches
  // web payantes, elle ne doit pas servir de service public.
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse(null, { status: 401 });

  const rawDomain = request.nextUrl.searchParams.get("d")?.trim().toLowerCase().replace(/^www\./, "") || null;
  const domain = rawDomain && isPublicHostname(rawDomain) && !GENERIC_EMAIL_DOMAINS.has(rawDomain) ? rawDomain : null;
  const rawName = request.nextUrl.searchParams.get("n")?.trim() || null;
  const name = rawName && rawName.length <= 80 ? rawName : null;
  if (!domain && !name) return new NextResponse(null, { status: 404, headers: { "Cache-Control": MISSING_CACHE } });

  const key = `${domain ?? ""}|${name?.toLowerCase() ?? ""}`;
  let logo = memo.get(key);
  if (logo === undefined) {
    logo = await resolveCompanyLogo(domain, name);
    memo.set(key, logo);
  }

  if (!logo) return new NextResponse(null, { status: 404, headers: { "Cache-Control": MISSING_CACHE } });
  return NextResponse.redirect(logo, { status: 302, headers: { "Cache-Control": FOUND_CACHE } });
}
