// Lecture d'un lien de campagne et destination du prospect.
// Volontairement SANS import : testable sans variables d'environnement
// (tests/campaign-click.test.ts).
//
// Les liens des mails Brief sont bâtis par le séquenceur
// (.claude/scripts/briefsend/gas/Code.js, lienSite_) :
//   https://brief-ai.fr/go?utm_source=email&utm_medium=prospection
//     &utm_campaign=c2&utm_content=mail1&r=1234

export type CampaignClick = {
  contactRef: string | null;
  campaign: string | null;
  mailStep: number | null;
  utmSource: string | null;
  utmMedium: string | null;
};

/** Toute valeur venue de l'URL est bornée : un lien est public, n'importe qui
 *  peut en fabriquer un avec un paramètre d'un mégaoctet. */
const MAX = 120;

function clean(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim().slice(0, MAX);
  return trimmed.length > 0 ? trimmed : null;
}

/** `utm_content=mail2` → 2. Toute autre forme → null plutôt qu'un chiffre
 *  inventé : une étape fausse se lit comme un fait dans les relevés. */
export function mailStepOf(utmContent: string | null | undefined): number | null {
  const m = /^mail([1-9])$/.exec((utmContent ?? "").trim());
  return m ? Number(m[1]) : null;
}

export function parseCampaignClick(url: URL): CampaignClick {
  const p = url.searchParams;
  return {
    contactRef: clean(p.get("r")),
    campaign: clean(p.get("utm_campaign"))?.toLowerCase() ?? null,
    mailStep: mailStepOf(p.get("utm_content")),
    utmSource: clean(p.get("utm_source")),
    utmMedium: clean(p.get("utm_medium")),
  };
}

/**
 * Où le prospect atterrit.
 *
 * Les `utm_*` sont conservés — l'outil d'audience du site doit continuer à
 * voir d'où vient la visite. `r` est retiré : l'identifiant du contact n'a
 * rien à faire dans la barre d'adresse de la personne, ni dans le référent
 * qu'elle enverra au site suivant.
 */
export function campaignDestination(url: URL, site: string): string {
  const dest = new URL(site);
  for (const [key, value] of url.searchParams) {
    if (key === "r") continue;
    if (key.startsWith("utm_")) dest.searchParams.set(key, value.slice(0, MAX));
  }
  return dest.toString();
}

/**
 * Les passerelles de sécurité des messageries (Proofpoint, Mimecast,
 * Defender…) ouvrent les liens à la place du destinataire, parfois dans la
 * minute qui suit l'envoi. Sans ce tri, un mail jamais lu compte comme un
 * clic — et on rappelle quelqu'un qui n'a rien fait.
 *
 * Le marquage est conservé plutôt que la ligne jetée : un faux négatif ici
 * effacerait un vrai clic, ce qui est pire. On trie à la lecture.
 */
const SCANNERS = [
  "proofpoint", "mimecast", "barracuda", "symantec", "forcepoint", "trendmicro",
  "microsoft office existence discovery", "bingpreview", "slackbot", "whatsapp",
  "googleimageproxy", "yahoomailproxy", "skypeuripreview", "facebookexternalhit",
  "twitterbot", "linkedinbot", "telegrambot", "discordbot",
];

export function looksAutomated(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return true; // aucun navigateur ne se présente sans en-tête
  // `bot\b` sans limite à gauche : « Googlebot/2.1 » et « Slackbot- » collent
  // le mot au nom du produit, `\bbot\b` les laissait passer.
  if (/(bot\b|crawler|spider|scanner|preview|\bcurl\/|\bwget\b|python-requests|headless)/.test(ua)) return true;
  return SCANNERS.some((s) => ua.includes(s));
}

export type CampaignSend = {
  contactRef: string;
  campaign: string | null;
  mailStep: number | null;
  sentAt: string;
};

/**
 * Le corps que le séquenceur envoie à /api/campaign/sent.
 *
 * Tout est vérifié : la route est publique, protégée par un jeton partagé qui
 * vit dans un classeur Google. Un jeton qui fuite ne doit permettre d'écrire
 * que des lignes bien formées.
 */
export function parseSendBody(body: unknown): CampaignSend | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const contactRef = typeof b.contactRef === "string" ? b.contactRef.trim().slice(0, MAX) : "";
  if (!contactRef) return null;

  const sentAtRaw = typeof b.sentAt === "string" ? b.sentAt : "";
  const sentAt = new Date(sentAtRaw);
  if (!sentAtRaw || Number.isNaN(sentAt.getTime())) return null;

  const campaign = typeof b.campaign === "string" ? b.campaign.trim().slice(0, MAX).toLowerCase() || null : null;
  const step = typeof b.mailStep === "number" ? b.mailStep : Number(b.mailStep);
  const mailStep = Number.isInteger(step) && step >= 1 && step <= 9 ? step : null;

  return { contactRef, campaign, mailStep, sentAt: sentAt.toISOString() };
}
