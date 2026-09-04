import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth/next";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { readConfig } from "@/lib/admin-config";
import { generateBrief, type GeneratedBriefJson } from "@/lib/brief-generator";
import { enrichWithPappers } from "@/lib/pappers";
import { fetchRecentNews } from "@/lib/news";
import { enrichContact, buildContactCard } from "@/lib/apollo";
import { getBriefByEventId, saveBrief, getUserProfile, withRetry } from "@/lib/db";
import { checkRateLimit, retryAfterMinutes } from "@/lib/rate-limit";
import { dispatchBriefPreCall } from "@/lib/notifications-dispatcher";
import { formatContactDisplayName } from "@/lib/format";

// Un brief avec recherche web réelle (max_uses: 3, cf. lib/brief-generator.ts)
// mesure ~54s en conditions réelles (Doctolib, 03/09/2026) — sans ce réglage
// Vercel coupe la fonction à son délai par défaut, bien en dessous. Même
// famille que import-transcript/objections-eval-run (chaîne IA longue),
// mais ceux-là enchaînent plusieurs appels Claude quand celui-ci n'en fait
// qu'un seul — 120s laisse une marge sans s'aligner sur leurs 300s.
export const maxDuration = 120;

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
  let meetingTitle: string | null = null;
  let meetingStartsAt: string | null = null;
  let force = false;

  try {
    const body = await request.json();
    company = body?.company;
    calendarEventId = body?.calendarEventId ?? null;
    contactEmail = body?.contactEmail ?? null;
    meetingTitle = body?.meetingTitle ?? null;
    meetingStartsAt = body?.meetingStartsAt ?? null;
    force = body?.force === true;
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
    const auth = await requireActiveUser(session);
    if (auth.ok) userId = auth.userId;
  } catch {
    // Session/compte non disponible ou désactivé — on continue sans cache ni persistance
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

  // Une régénération lancée sans contact ne doit pas effacer celui qui est
  // déjà enregistré. Le client peut légitimement ne pas l'avoir sous la main
  // (page ouverte via un lien sans le paramètre, contact ajouté après le
  // chargement...), mais la base, elle, le sait : on le reprend de là.
  //
  // Sans ça, régénérer un brief dont on venait de renseigner le contact
  // vidait `content.contact` — la fiche disparaissait de l'écran alors que
  // l'adresse restait bien en base (constaté le 04/09/2026). C'est le filet
  // qui protège TOUS les chemins, indépendamment de ce que le client envoie.
  if (!contactEmail && userId && calendarEventId) {
    try {
      const existing = await getBriefByEventId(userId, calendarEventId);
      const known = (existing as { contact_email?: string | null } | null)?.contact_email;
      if (known) {
        contactEmail = known;
        console.log("[generate-brief] contactEmail repris depuis le brief enregistré");
      }
    } catch (err) {
      console.error("[generate-brief] lookup contact_email failed:", err);
    }
  }

  // Cache : retourner le brief existant sans rappeler le modèle (ignoré si force=true)
  if (!force && userId && calendarEventId) {
    try {
      const cached = await getBriefByEventId(userId, calendarEventId);
      if (cached?.content) {
        console.log("[generate-brief] cache hit for calendarEventId:", calendarEventId);
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

    const [pappersData, newsArticles, apolloContact] = await Promise.all([
      enrichWithPappers(trimmed),
      fetchRecentNews(trimmed, contactDomain),
      contactEmail ? enrichContact(contactEmail) : Promise.resolve(null),
    ]);

    console.log('[generate-brief] contactEmail:', contactEmail, '| userId:', userId);
    const brief = await generateBrief(
      trimmed,
      config,
      userContext,
      pappersData,
      newsArticles,
      userId ?? undefined,
      contactEmail,
      apolloContact
    );

    // Fiche contact affichée dans la barre latérale du brief (panneau
    // "Contacts") — construite ici, pas par le modèle : les champs viennent
    // directement d'Apollo (factuels) ou, à défaut, du seul email connu (le
    // fallback existant avant toute enrichissement). Fusionnée dans `brief`
    // avant sauvegarde pour qu'une relecture en cache n'ait pas besoin de
    // rappeler Apollo (10 crédits/mois sur le plan gratuit — cf. lib/apollo.ts).
    const contactCard = contactEmail ? buildContactCard(apolloContact, contactEmail) : null;
    const briefWithContact = contactCard
      ? { ...(brief as Record<string, unknown>), contact: contactCard }
      : brief;

    if (userId) {
      // Wrapped in after() instead of plain fire-and-forget: Vercel can
      // freeze the serverless function as soon as the response below is
      // sent, killing an unawaited promise before it completes — this is
      // what silently dropped saveBrief/dispatchBriefPreCall (confirmed live:
      // "[generate-brief] contactEmail:" logged, but the subsequent
      // "dispatchBriefPreCall results:" line never did, for several minutes
      // after the request). after() keeps the function alive until this
      // callback settles without delaying the response itself.
      after(async () => {
        const savePromise = withRetry(() =>
          saveBrief(userId, trimmed, contactEmail, calendarEventId, briefWithContact, config.model, meetingTitle)
        ).catch((err) => console.error("[generate-brief] saveBrief failed after retries:", err));

        // A dispatch failure must never surface as a brief-generation error
        // (dispatchBriefPreCall itself never throws; this catch is just a
        // last-resort safety net).
        const dispatchPromise = dispatchBriefPreCall(userId, brief as GeneratedBriefJson, {
          calendarEventId,
          meetingTitle: trimmed,
          meetingStartsAt,
          contactName: contactEmail ? formatContactDisplayName(null, contactEmail) : null,
          contactEmail,
        })
          .then((results) => console.log("[generate-brief] dispatchBriefPreCall results:", results))
          .catch((err) => console.error("[generate-brief] dispatchBriefPreCall failed:", err));

        await Promise.all([savePromise, dispatchPromise]);
      });
    }

    return NextResponse.json(briefWithContact);
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
