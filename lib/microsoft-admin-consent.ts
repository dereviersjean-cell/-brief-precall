// Consentement administrateur Microsoft.
//
// POURQUOI CETTE ÉTAPE EXISTE (ne pas la chercher ailleurs) : sur un tenant
// Microsoft 365, un salarié ne peut pas consentir seul aux droits que Brief
// demande. Le réglage par défaut d'un tenant n'autorise le consentement
// utilisateur que pour les autorisations classées à faible impact — openid,
// profile, email, offline_access, User.Read — et ni Calendars.Read ni
// Mail.Send n'en font partie. La vérification de l'éditeur Azure n'y change
// rien : elle retire l'avertissement « éditeur non vérifié » de l'écran de
// consentement, pas le verrou. L'accord de l'administrateur est donc une
// étape d'installation à demander une fois par entreprise cliente, pas un
// incident à contourner.
//
// Tout est pur et testé (tests/microsoft-admin-consent.test.ts), sauf
// `resolveMicrosoftTenant`, qui interroge Microsoft.

import { createHmac, timingSafeEqual } from "crypto";
import { MICROSOFT_LOGIN_SCOPES } from "./microsoft";

export type MicrosoftAdminConsent = {
  /** Identifiant du tenant qui a accordé l'accès. */
  tenant: string;
  grantedAt: string;
  /** L'administrateur, quand Microsoft le donne — il n'est pas garanti. */
  grantedBy: string | null;
};

/** Lecture défensive de la colonne jsonb : une forme inattendue vaut « pas d'accord ». */
export function coerceMicrosoftAdminConsent(raw: unknown): MicrosoftAdminConsent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.tenant !== "string" || !o.tenant.trim()) return null;
  if (typeof o.grantedAt !== "string" || !o.grantedAt.trim()) return null;
  return {
    tenant: o.tenant,
    grantedAt: o.grantedAt,
    grantedBy: typeof o.grantedBy === "string" && o.grantedBy.trim() ? o.grantedBy : null,
  };
}

/**
 * L'URL que l'administrateur du client doit ouvrir.
 *
 * `tenant` : l'identifiant du tenant quand on le connaît (l'administrateur
 * n'a alors rien à choisir), sinon « organizations » — Microsoft demande
 * d'abord à quel compte professionnel il se connecte. Jamais « common »,
 * qui accepte les comptes personnels : un compte Outlook personnel n'a pas
 * d'administrateur, la page finirait en erreur.
 *
 * Les droits demandés sont exactement ceux de la connexion
 * (MICROSOFT_LOGIN_SCOPES) : l'administrateur doit retrouver dans l'écran
 * Microsoft ce que l'email lui a annoncé. L'alternative `.default` accorderait
 * tout ce qui est déclaré sur l'app Azure, sans que personne ici ne contrôle
 * cette liste — écartée pour cette raison.
 */
export function buildAdminConsentUrl(opts: {
  clientId: string;
  tenant?: string | null;
  redirectUri: string;
  /**
   * Absent sur le lien offert à un commercial bloqué : il n'a pas de compte,
   * donc pas d'organisation à porter. L'accord fonctionne quand même côté
   * Microsoft — c'est lui qui débloque l'entreprise — mais Brief ne peut
   * l'attribuer à personne et le dit (voir le retour de consentement).
   */
  state?: string | null;
}): string {
  const tenant = opts.tenant?.trim() || "organizations";
  const params = new URLSearchParams({
    client_id: opts.clientId,
    scope: MICROSOFT_LOGIN_SCOPES,
    redirect_uri: opts.redirectUri,
  });
  if (opts.state) params.set("state", opts.state);
  return `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/v2.0/adminconsent?${params.toString()}`;
}

/** `https://login.microsoftonline.com/<tenant>/v2.0` → `<tenant>`. */
export function tenantFromIssuer(issuer: unknown): string | null {
  if (typeof issuer !== "string") return null;
  const m = /^https:\/\/login\.microsoftonline\.com\/([0-9a-f-]{36})\/v2\.0\/?$/i.exec(issuer.trim());
  return m ? m[1] : null;
}

/**
 * Le tenant d'un domaine d'email, demandé à Microsoft. Null quand le domaine
 * n'est pas un Microsoft 365 (gmail.com, outlook.com…) ou que Microsoft ne
 * répond pas : l'appelant retombe alors sur « organizations ».
 *
 * Seule fonction de ce fichier qui touche le réseau.
 */
export async function resolveMicrosoftTenant(domain: string): Promise<string | null> {
  const clean = domain.trim().toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) return null;
  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(clean)}/v2.0/.well-known/openid-configuration`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { issuer?: unknown };
    return tenantFromIssuer(data.issuer);
  } catch {
    return null;
  }
}

// --- L'état porté par l'URL --------------------------------------------
//
// Un cookie ne marche PAS ici, contrairement aux autres départs OAuth de
// l'app (app/api/recall/*-oauth/start) : celui qui ouvre le lien de
// consentement est l'administrateur informatique du client, dans SON
// navigateur, souvent des jours plus tard, et il n'a pas de compte Brief.
// L'état doit donc se suffire à lui-même — il porte l'organisation et il est
// signé, pour que personne ne puisse écrire un accord sur l'organisation
// d'un autre.

const STATE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function b64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload: string, secret: string): string {
  return b64url(createHmac("sha256", secret).update(payload).digest());
}

export function signConsentState(
  value: { organizationId: string; issuedAt?: number },
  secret: string
): string {
  const payload = b64url(
    Buffer.from(JSON.stringify({ o: value.organizationId, t: value.issuedAt ?? Date.now() }), "utf8")
  );
  return `${payload}.${sign(payload, secret)}`;
}

/** Null dès que l'état est absent, mal formé, mal signé ou périmé. */
export function verifyConsentState(
  state: string | null | undefined,
  secret: string,
  now: number = Date.now()
): { organizationId: string } | null {
  if (!state || !secret) return null;
  const dot = state.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = state.slice(0, dot);
  const given = state.slice(dot + 1);
  const expected = sign(payload, secret);
  // Longueurs comparées d'abord : timingSafeEqual lève sur deux tampons de
  // tailles différentes.
  if (given.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return null;
  try {
    const raw = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    const o = raw as { o?: unknown; t?: unknown };
    if (typeof o.o !== "string" || !o.o) return null;
    if (typeof o.t !== "number" || !Number.isFinite(o.t)) return null;
    if (now - o.t > STATE_TTL_MS || o.t - now > 60_000) return null;
    return { organizationId: o.o };
  } catch {
    return null;
  }
}

// --- Le refus de Microsoft ---------------------------------------------

/**
 * Reconnaît un refus faute de consentement, dans ce que Microsoft renvoie.
 *
 * AADSTS65001 : ni l'utilisateur ni l'administrateur n'a consenti.
 * AADSTS90094 : l'octroi demandé exige un administrateur.
 * `error_subcode=consent_required` : la même chose, sans le code.
 *
 * ⚠ NextAuth masque le détail : sur un refus pendant la connexion, la page
 * /login ne reçoit souvent qu'un `error=OAuthCallback` sans description. D'où
 * l'instrumentation posée dans lib/auth.ts (`logger.error` →
 * reportWarning "auth.oauth_error"), qui enregistre ce qui arrive vraiment.
 * Tant qu'un vrai refus n'a pas été observé, l'écran de connexion propose
 * l'explication sans l'affirmer.
 */
export function isAdminConsentRequired(params: {
  error?: string | null;
  errorDescription?: string | null;
  errorSubcode?: string | null;
}): boolean {
  const haystack = `${params.error ?? ""} ${params.errorDescription ?? ""} ${params.errorSubcode ?? ""}`.toLowerCase();
  return (
    haystack.includes("aadsts65001") ||
    haystack.includes("aadsts90094") ||
    haystack.includes("consent_required") ||
    haystack.includes("admin_consent_required")
  );
}

// --- Le message pour l'informatique du client --------------------------

export const CONSENT_MAIL_SUBJECT = "Autoriser Brief sur notre Microsoft 365";

/**
 * Le texte que le manager envoie à son informatique. Écrit pour ce qu'une
 * DSI vérifie : le nom exact des droits (qu'elle retrouve dans Entra ID), ce
 * qui n'est PAS demandé, et comment retirer l'accord. Aucune mention de
 * certification ou de conformité : rien qu'on ne puisse montrer.
 */
export function consentMailBody(opts: { link: string; senderName?: string | null }): string {
  const signature = opts.senderName?.trim() ? `\n\nMerci,\n${opts.senderName.trim()}` : "\n\nMerci.";
  return [
    "Bonjour,",
    "",
    "Nous utilisons Brief pour préparer et débriefer nos rendez-vous commerciaux. Pour qu'il lise nos agendas Outlook, Microsoft demande votre accord, une fois, pour l'organisation.",
    "",
    "Le lien à ouvrir, en étant connecté avec votre compte administrateur :",
    opts.link,
    "",
    "Les droits demandés, en entier :",
    "- Calendars.Read — lire l'agenda des salariés qui se connectent à Brief",
    "- Mail.Send — envoyer un email en leur nom, après qu'ils l'ont relu",
    "- openid, email, profile, offline_access — identifier le compte et rester connecté",
    "",
    "Aucun droit de lecture de la messagerie : ni contenu, ni en-têtes. Aucune écriture dans l'agenda, aucun accès aux fichiers.",
    "",
    "L'accord ne vaut que pour les salariés qui se connectent eux-mêmes, pas pour l'ensemble des boîtes. Il se retire à tout moment depuis Entra ID › Applications d'entreprise › Brief.",
    "",
    "Éditeur : Oliverlist — brief-ai.fr. Données hébergées en Europe.",
  ].join("\n") + signature;
}

/** Le `mailto:` du bouton « Envoyer à mon informatique » — Brief n'envoie rien lui-même. */
export function consentMailto(opts: { link: string; senderName?: string | null; to?: string | null }): string {
  const params = new URLSearchParams({
    subject: CONSENT_MAIL_SUBJECT,
    body: consentMailBody(opts),
  });
  return `mailto:${opts.to?.trim() ?? ""}?${params.toString()}`;
}
