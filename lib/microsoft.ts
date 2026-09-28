// Compte Microsoft de connexion (NextAuth, provider azure-ad) : renouvellement
// du jeton d'accès et envoi d'emails via Microsoft Graph. Pendant côté
// Microsoft de lib/gmail.ts.
//
// À ne pas confondre avec l'app Microsoft de Recall
// (app/api/recall/microsoft-oauth/*) : c'est une AUTRE application Azure,
// qui ne sert qu'à brancher l'agenda sur le bot d'enregistrement.

// Partagé entre la demande initiale (lib/auth.ts) et le renouvellement : un
// renouvellement qui demanderait moins que la connexion rendrait un jeton
// amputé, un renouvellement qui demanderait plus échouerait faute de
// consentement.
//
// Mail.Send ajouté le 28/09/2026 : avant, un utilisateur Microsoft ne pouvait
// envoyer aucun email depuis Brief (tout passait par l'API Gmail). Comme pour
// gmail.send, c'est un droit d'ENVOI seul — aucune lecture de la messagerie.
export const MICROSOFT_LOGIN_SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "https://graph.microsoft.com/Calendars.Read",
  "https://graph.microsoft.com/Mail.Send",
].join(" ");

// Même valeur que celle retenue par le provider azure-ad de NextAuth
// (`tenantId ?? "common"`). En prod : « common », vérifié le 28/09/2026 sur
// l'URL d'autorisation — tout compte Microsoft, de n'importe quelle
// entreprise, peut se connecter.
function tenant(): string {
  return process.env.AZURE_AD_TENANT_ID || "common";
}

export async function refreshMicrosoftAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}> {
  const res = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      scope: MICROSOFT_LOGIN_SCOPES,
    }),
  });

  if (!res.ok) {
    throw new Error(`Microsoft token refresh failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: data.access_token,
    // Microsoft fait tourner le refresh_token à chaque renouvellement : on
    // garde le nouveau, l'ancien seulement s'il n'en rend pas.
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

export type OutlookMail = {
  to: string;
  subject: string;
  body: string;
  attachment?: { filename: string; contentType: string; content: Buffer };
};

export type OutlookSendResult = { ok: true } | { ok: false; status: number; detail: string };

// JSON plutôt que MIME : Graph accepte aussi un message MIME brut, mais le
// format JSON règle seul l'encodage des accents (sujet et corps) et des
// pièces jointes, là où le MIME demande de tout encoder à la main.
export async function sendOutlookMail(accessToken: string, mail: OutlookMail): Promise<OutlookSendResult> {
  const message: Record<string, unknown> = {
    subject: mail.subject,
    body: { contentType: "Text", content: mail.body },
    toRecipients: [{ emailAddress: { address: mail.to } }],
  };
  if (mail.attachment) {
    message.attachments = [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: mail.attachment.filename,
        contentType: mail.attachment.contentType,
        contentBytes: mail.attachment.content.toString("base64"),
      },
    ];
  }

  let res: Response;
  try {
    res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      // saveToSentItems : le message apparaît dans « Éléments envoyés »,
      // comme un email écrit à la main.
      body: JSON.stringify({ message, saveToSentItems: true }),
    });
  } catch (err) {
    return { ok: false, status: 0, detail: err instanceof Error ? err.message : String(err) };
  }

  // 202 Accepted, sans corps : Graph ne rend ni identifiant de message ni fil.
  if (res.ok) return { ok: true };
  return { ok: false, status: res.status, detail: await res.text() };
}

// Message montré à l'utilisateur. 401/403 : jeton expiré, ou droit d'envoi
// jamais accordé — dans les deux cas, se reconnecter redemande le
// consentement et règle le problème.
export function outlookSendFailure(result: { status: number }): { error: string; status: number } {
  if (result.status === 401 || result.status === 403) {
    return { error: "Session Microsoft expirée. Reconnectez-vous pour envoyer l'email.", status: 401 };
  }
  return { error: "Erreur lors de l'envoi de l'email.", status: 500 };
}
