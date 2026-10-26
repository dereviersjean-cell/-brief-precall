import { Resend } from "resend";
import { marked, Renderer } from "marked";
import { APP_URL } from "@/lib/app-url";

// Palette for the two notification templates below (module Distribution
// Flexible, sous-étape B) — distinct from the indigo (#4f46e5) used by the
// simpler transactional emails above; matches the landing page's actual
// black header + violet accent.
const NOTIF = {
  bg: "#FFFFFF",
  header: "#0F172A",
  accent: "#7C3AED",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  card: "#F9FAFB",
};

// Échappe une valeur saisie (nom, organisation) avant de l'insérer dans le
// HTML de l'email : un nom contenant « < » casserait la mise en page.
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Email d'invitation, refait le 29/09/2026 (retour de Jean : trop nu). Mise
// en page d'email classique — tableaux et styles en ligne, pas de flex ni
// de CSS externe, que Gmail et Outlook ignorent. Couleurs de la marque
// (--gradient-brand de globals.css, avec une couleur de repli pour les
// clients qui ne gèrent pas les dégradés). Les bénéfices listés sont ceux du
// SOCLE uniquement (briefs, agenda, comptes-rendus) : un nouveau client est
// dans le parcours, ses autres modules sont encore fermés.
export function buildInvitationHtml(params: {
  to: string;
  invitedByName: string;
  organizationName: string;
  role: "manager" | "commercial";
}): string {
  const loginUrl = `${APP_URL}/login`;
  const inviter = escapeHtml(params.invitedByName);
  const org = escapeHtml(params.organizationName);
  const email = escapeHtml(params.to);
  const role = params.role === "manager" ? "manager" : "commercial";
  const brand = "#2B4BD0";
  const brandGradient = "linear-gradient(135deg, #2B4BD0 0%, #1D86E0 100%)";

  const benefit = (title: string, text: string) => `
    <tr>
      <td valign="top" style="padding: 0 12px 14px 0; width: 22px;">
        <div style="width: 22px; height: 22px; border-radius: 11px; background: #EAF0FF; color: ${brand}; font-size: 13px; font-weight: 700; line-height: 22px; text-align: center;">&#10003;</div>
      </td>
      <td valign="top" style="padding: 0 0 14px 0; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #0F172A;">${title}</strong><br />${text}
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="fr">
  <body style="margin: 0; padding: 0; background: #F3F5FA;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${inviter} vous a ouvert un accès à Brief pour l'équipe ${org}.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #F3F5FA; padding: 32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <tr>
              <td style="padding: 0 4px 20px 4px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width: 36px; height: 36px; border-radius: 10px; background: ${brand}; background-image: ${brandGradient}; color: #FFFFFF; font-size: 18px; font-weight: 700; text-align: center; line-height: 36px;">B</td>
                    <td style="padding-left: 10px; font-size: 18px; font-weight: 700; color: #0F172A;">Brief</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background: #FFFFFF; border: 1px solid #E5E9F2; border-radius: 16px; overflow: hidden;">
                <div style="height: 4px; background: ${brand}; background-image: ${brandGradient};"></div>
                <div style="padding: 32px 32px 28px 32px;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${brand};">Équipe ${org}</p>
                  <h1 style="margin: 0 0 16px 0; font-size: 24px; line-height: 1.3; color: #0F172A;">Votre accès à Brief est prêt</h1>
                  <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                    <strong style="color: #0F172A;">${inviter}</strong> vous a ouvert un compte pour l'équipe <strong style="color: #0F172A;">${org}</strong>, en tant que ${role}.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 12px 0;">
                    ${benefit("Un brief avant chaque rendez-vous", "L'entreprise, l'interlocuteur et les bons angles, préparés pour vous.")}
                    ${benefit("Vos rendez-vous repérés dans votre agenda", "Google ou Outlook : rien à saisir, Brief sait quand vous voyez qui.")}
                    ${benefit("Le compte-rendu de vos calls", "Points clés et analyse de chaque visio, sans prendre de notes.")}
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                    <tr>
                      <td style="border-radius: 10px; background: ${brand}; background-image: ${brandGradient};">
                        <a href="${loginUrl}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none;">Activer mon compte &rarr;</a>
                      </td>
                    </tr>
                  </table>
                  <div style="background: #F6F8FC; border: 1px solid #E5E9F2; border-radius: 10px; padding: 14px 16px; font-size: 13px; line-height: 1.55; color: #475569;">
                    Connectez-vous avec <strong style="color: #0F172A;">Google ou Microsoft</strong>, en utilisant cette adresse&nbsp;: <strong style="color: #0F172A;">${email}</strong>.
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 8px 0 8px; font-size: 12px; line-height: 1.6; color: #94A3B8; text-align: center;">
                Vous recevez cet email parce qu'un compte Brief a été ouvert à votre nom pour l'équipe ${org}.<br />
                Si vous ne vous y attendiez pas, vous pouvez l'ignorer.<br />
                <a href="${APP_URL}" style="color: #94A3B8;">brief-ai.fr</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Alerte interne — CTA "Je veux débloquer ce module" sur la page verrouillée
// d'Entraînement (app/training/TrainingLockedClient.tsx). Destinataire fixé
// par ADMIN_NOTIFICATION_EMAIL (pas de fallback codé en dur sur une adresse
// perso) ; si la variable n'est pas configurée, l'appelant journalise et
// n'envoie rien — la demande reste tracée en base (training_unlock_requests)
// dans tous les cas.
export async function sendTrainingUnlockRequestEmail(params: {
  to: string;
  userName: string | null;
  userEmail: string;
  organizationName: string | null;
}): Promise<void> {
  const { to, userName, userEmail, organizationName } = params;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0f172a;">
      <div style="width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: #ffffff; font-weight: bold; font-size: 18px; line-height: 40px; text-align: center; display: block; width: 40px;">B</span>
      </div>
      <h1 style="font-size: 20px; margin: 0 0 16px;">Demande de déblocage — Entraînement</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 8px;">
        <strong>${userName ?? userEmail}</strong> (${userEmail}) a cliqué sur « Je veux débloquer ce module » depuis
        l&apos;organisation <strong>${organizationName ?? "sans organisation"}</strong>.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
        Débloquer depuis /admin/organizations → l&apos;organisation → Facturation → Modules additionnels.
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Demande de déblocage — Entraînement (${organizationName ?? userEmail})`,
    html,
  });

  if (error) {
    throw new Error(`sendTrainingUnlockRequestEmail failed: ${error.message}`);
  }
}

export async function sendInvitationEmail(params: {
  to: string;
  invitedByName: string;
  organizationName: string;
  role: "manager" | "commercial";
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: params.to,
    // Le nom de l'équipe dans l'objet : c'est lui que le destinataire reconnaît.
    subject: `Votre accès à Brief pour l'équipe ${params.organizationName}`,
    html: buildInvitationHtml(params),
  });

  if (error) {
    throw new Error(`sendInvitationEmail failed: ${error.message}`);
  }
}

// Agenda coupé chez Recall (jeton expiré ou révoqué) : plus aucune réunion
// n'est enregistrée, et rien dans l'app ne le montrait tant que personne
// n'allait voir. Envoyé UNE fois, au passage à « disconnected » détecté par
// la synchronisation des 5 minutes (lib/calendar-health.ts).
// Code à usage unique (connexion sans SSO, 14/10/2026). Trois usages, trois
// tons : la bienvenue d'une inscription (illustration, prénom), une
// connexion, un nouveau mot de passe. Mise en page en tableaux et styles en
// ligne : c'est ce que Gmail et Outlook affichent fidèlement.
export type LoginCodeIntent = "signup" | "login" | "reset";

export function buildLoginCodeEmail(params: { code: string; intent: LoginCodeIntent; firstName?: string | null }): {
  subject: string;
  html: string;
} {
  const spaced = `${params.code.slice(0, 3)} ${params.code.slice(3)}`;
  const first = params.firstName ? escapeHtml(params.firstName) : null;
  const copy = {
    signup: {
      subject: `Bienvenue sur Brief 🚀 — votre code ${spaced}`,
      title: first ? `Bienvenue à bord, ${first} !` : "Bienvenue à bord !",
      lead: "Plus qu'une étape : saisissez ce code pour confirmer votre adresse et créer votre compte.",
      after: "Ensuite, trois questions pour personnaliser vos briefs, et votre premier rendez-vous est prêt en deux minutes.",
    },
    login: {
      subject: `${spaced} — votre code de connexion à Brief`,
      title: "Votre code de connexion",
      lead: "Saisissez ce code sur la page de connexion de Brief.",
      after: null,
    },
    reset: {
      subject: `${spaced} — nouveau mot de passe Brief`,
      title: "Choisissez un nouveau mot de passe",
      lead: "Saisissez ce code sur la page de connexion, avec votre nouveau mot de passe.",
      after: null,
    },
  }[params.intent];

  const banner =
    params.intent === "signup"
      ? `<tr><td style="padding:0;"><img src="${APP_URL}/email/welcome-rocket.jpg" width="560" alt="" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:24px 24px 0 0;" /></td></tr>`
      : `<tr><td style="padding:28px 36px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
           <td style="width:32px;height:32px;border-radius:10px;background:#2A5CE0;background-image:linear-gradient(135deg,#2A5CE0,#6A4BE8);color:#ffffff;font:600 15px/32px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;">B</td>
           <td style="padding-left:10px;font:600 16px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">Brief</td>
         </tr></table></td></tr>`;

  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#F3F5FB;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F5FB;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:24px;box-shadow:0 12px 40px -24px rgba(42,92,224,0.45);">
      ${banner}
      <tr><td style="padding:32px 36px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
        <h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;">${copy.title}</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">${copy.lead}</p>
      </td></tr>
      <tr><td style="padding:20px 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2FF;background-image:linear-gradient(135deg,#EEF2FF,#F3EEFF);border-radius:18px;">
          <tr><td align="center" style="padding:22px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:40px;font-weight:700;letter-spacing:8px;color:#2A5CE0;">${spaced}</td></tr>
          <tr><td align="center" style="padding:0 12px 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#6A4BE8;">Valable 10 minutes · usage unique</td></tr>
        </table>
      </td></tr>
      ${
        copy.after
          ? `<tr><td style="padding:0 36px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#475569;">${copy.after}</td></tr>`
          : ""
      }
      <tr><td style="padding:16px 36px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.6;color:#94a3b8;">
        Vous n'avez rien demandé ? Ignorez simplement cet email : personne ne peut utiliser votre adresse sans ce code.
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#94a3b8;">Brief — chaque rendez-vous préparé en deux minutes.</p>
  </td></tr>
</table>
</body></html>`;
  return { subject: copy.subject, html };
}

export async function sendLoginCodeEmail(params: { to: string; code: string; intent: LoginCodeIntent; firstName?: string | null }): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { subject, html } = buildLoginCodeEmail(params);
  const { error } = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL!, to: params.to, subject, html });
  if (error) {
    throw new Error(`sendLoginCodeEmail failed: ${error.message}`);
  }
}

export async function sendCalendarDisconnectedEmail(params: {
  to: string;
  firstName: string | null;
  disconnectedAt: string | null;
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const reconnectUrl = `${APP_URL}/settings/connexions`;
  const since = params.disconnectedAt
    ? ` depuis le ${new Date(params.disconnectedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}`
    : "";
  const hello = params.firstName ? `Bonjour ${params.firstName},` : "Bonjour,";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0f172a;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">Votre agenda n'est plus relié à Brief</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 12px;">${hello}</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 12px;">
        L'accès de Brief à votre agenda a expiré${since}. Tant qu'il n'est pas rétabli, vos rendez-vous en visio
        ne sont <strong>plus enregistrés ni analysés</strong>.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
        Pour le rétablir, il suffit de reconnecter votre agenda : moins d'une minute.
      </p>
      <a href="${reconnectUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
        Reconnecter mon agenda
      </a>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: params.to,
    subject: "Votre agenda n'est plus relié à Brief",
    html,
  });
  if (error) {
    throw new Error(`sendCalendarDisconnectedEmail failed: ${error.message}`);
  }
}

function buildQuoteAcceptedHtml(params: {
  quoteNumber: string;
  clientName: string;
  totalTtc: number;
  quoteUrl: string;
}): string {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(params.totalTtc);

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0f172a;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">🎉 Devis accepté !</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
        <strong>${params.clientName}</strong> vient d'accepter le devis <strong>${params.quoteNumber}</strong>
        d'un montant de <strong>${amount}</strong> TTC.
      </p>
      <a href="${params.quoteUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
        Voir le devis
      </a>
    </div>
  `;
}

export async function sendQuoteAcceptedEmail(params: {
  to: string;
  quoteNumber: string;
  clientName: string;
  totalTtc: number;
  quoteId: string;
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const quoteUrl = `${APP_URL}/quotes/${params.quoteId}`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: params.to,
    subject: `🎉 Votre devis ${params.quoteNumber} a été accepté`,
    html: buildQuoteAcceptedHtml({ ...params, quoteUrl }),
  });

  if (error) {
    throw new Error(`sendQuoteAcceptedEmail failed: ${error.message}`);
  }
}

// ─── Notifications module (Distribution Flexible, sous-étape B) ───────────

// Every renderer method emits inline `style="..."` attributes directly —
// not a <style> block — since Outlook desktop (Word rendering engine) and
// several webmail clients strip or ignore embedded/external stylesheets.
// Validated by hand against real generateKeyPoints output (headers, bold
// lists, and a GFM table for "Prochaines étapes") before wiring in.
function createEmailMarkdownRenderer(): Renderer {
  const renderer = new Renderer();

  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens);
    const size = depth <= 2 ? "16px" : "14px";
    return `<h${depth} style="font-size:${size};font-weight:600;color:${NOTIF.textPrimary};margin:20px 0 8px;">${text}</h${depth}>`;
  };
  renderer.paragraph = ({ tokens }) => {
    const text = renderer.parser.parseInline(tokens);
    return `<p style="font-size:14px;color:${NOTIF.textPrimary};line-height:1.6;margin:0 0 12px;">${text}</p>`;
  };
  renderer.list = (token) => {
    const tag = token.ordered ? "ol" : "ul";
    const body = token.items.map((item) => renderer.listitem(item)).join("");
    return `<${tag} style="margin:0 0 12px;padding-left:20px;color:${NOTIF.textPrimary};">${body}</${tag}>`;
  };
  renderer.listitem = (item) => {
    const text = renderer.parser.parseInline(item.tokens);
    return `<li style="font-size:14px;line-height:1.6;margin-bottom:4px;">${text}</li>`;
  };
  renderer.strong = ({ tokens }) => {
    const text = renderer.parser.parseInline(tokens);
    return `<strong style="font-weight:600;color:${NOTIF.textPrimary};">${text}</strong>`;
  };
  renderer.hr = () => `<hr style="border:none;border-top:1px solid ${NOTIF.border};margin:20px 0;" />`;
  renderer.table = (token) => {
    const headerCells = token.header
      .map(
        (cell) =>
          `<th style="text-align:left;font-size:11px;text-transform:uppercase;color:${NOTIF.textSecondary};padding:6px 8px;border-bottom:1px solid ${NOTIF.border};">${renderer.parser.parseInline(cell.tokens)}</th>`
      )
      .join("");
    const bodyRows = token.rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="font-size:13px;color:${NOTIF.textPrimary};padding:6px 8px;border-top:1px solid ${NOTIF.border};">${renderer.parser.parseInline(cell.tokens)}</td>`
            )
            .join("")}</tr>`
      )
      .join("");
    return `<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 12px;"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  };

  return renderer;
}

function renderMarkdownForEmail(markdown: string): string {
  return marked.parse(markdown, { renderer: createEmailMarkdownRenderer() }) as string;
}

function emailHeaderHtml(): string {
  return `
    <tr>
      <td style="background:${NOTIF.header};padding:24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:32px;height:32px;background:${NOTIF.accent};border-radius:8px;text-align:center;vertical-align:middle;">
            <span style="color:#ffffff;font-weight:bold;font-size:16px;line-height:32px;">B</span>
          </td>
          <td style="padding-left:10px;color:#ffffff;font-weight:700;font-size:16px;">Brief</td>
        </tr></table>
      </td>
    </tr>`;
}

function emailFooterHtml(): string {
  return `
    <tr>
      <td style="padding:20px 32px;border-top:1px solid ${NOTIF.border};">
        <p style="font-size:12px;color:#9CA3AF;margin:0;">Généré automatiquement par Brief.</p>
      </td>
    </tr>`;
}

function ctaButtonHtml(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td style="border-radius:8px;background:${NOTIF.accent};">
          <a href="${url}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function emailShellHtml(bodyHtml: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NOTIF.bg};">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid ${NOTIF.border};border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            ${emailHeaderHtml()}
            <tr><td style="padding:32px;">${bodyHtml}</td></tr>
            ${emailFooterHtml()}
          </table>
        </td>
      </tr>
    </table>`;
}

function formatMeetingDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

export async function sendBriefPreCallEmail(params: {
  to: string;
  userName: string | null;
  meetingTitle: string;
  meetingStartsAt: string | null;
  contactName: string | null;
  contactEmail: string | null;
  briefContent: string; // markdown — see formatBriefAsMarkdown in lib/brief-generator.ts
  briefUrl: string;
}): Promise<void> {
  const { to, meetingTitle, meetingStartsAt, contactName, contactEmail, briefContent, briefUrl } = params;

  const contextLines = [
    `<p style="font-size:14px;color:${NOTIF.textPrimary};margin:0 0 4px;"><strong>${meetingTitle}</strong></p>`,
    meetingStartsAt
      ? `<p style="font-size:13px;color:${NOTIF.textSecondary};margin:0 0 4px;">🕐 ${formatMeetingDateTime(meetingStartsAt)}</p>`
      : "",
    contactName
      ? `<p style="font-size:13px;color:${NOTIF.textSecondary};margin:0;">👤 ${contactName}${contactEmail ? ` (${contactEmail})` : ""}</p>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const body = `
    <h1 style="font-size:20px;font-weight:700;color:${NOTIF.textPrimary};margin:0 0 20px;">📄 Votre brief est prêt</h1>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NOTIF.card};border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${NOTIF.textSecondary};margin:0 0 8px;font-weight:600;">Contexte du rendez-vous</p>
        ${contextLines}
      </td></tr>
    </table>
    ${renderMarkdownForEmail(briefContent)}
    ${ctaButtonHtml("Voir dans Brief", briefUrl)}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = `📄 Brief pour votre rendez-vous avec ${contactName ?? meetingTitle}`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    html: emailShellHtml(body),
  });

  if (error) {
    throw new Error(`sendBriefPreCallEmail failed: ${error.message}`);
  }
}

const SCORE_COLORS = (score: number | null): { text: string; bg: string } => {
  if (score === null) return { text: NOTIF.textSecondary, bg: NOTIF.card };
  if (score >= 4) return { text: "#15803D", bg: "#DCFCE7" };
  if (score >= 2.5) return { text: "#C2410C", bg: "#FFEDD5" };
  return { text: "#B91C1C", bg: "#FEE2E2" };
};

const SENTIMENT_COLORS: Record<string, { text: string; bg: string }> = {
  positif: { text: "#15803D", bg: "#DCFCE7" },
  neutre: { text: NOTIF.textSecondary, bg: NOTIF.card },
  négatif: { text: "#B91C1C", bg: "#FEE2E2" },
};

export async function sendCallAnalysisEmail(params: {
  to: string;
  userName: string | null;
  callTitle: string;
  contactName: string | null;
  keyPoints: string | null; // markdown — see lib/key-points.ts
  globalScore: number | null;
  sentiment: string | null;
  analysisUrl: string;
}): Promise<void> {
  const { to, callTitle, contactName, keyPoints, globalScore, sentiment, analysisUrl } = params;

  const scoreColor = SCORE_COLORS(globalScore);
  const sentimentColor = sentiment ? SENTIMENT_COLORS[sentiment] ?? { text: NOTIF.textSecondary, bg: NOTIF.card } : null;

  const scoreCell = `
    <td style="padding:16px 20px;background:${NOTIF.card};border-radius:8px;" width="50%">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${NOTIF.textSecondary};margin:0 0 8px;font-weight:600;">Score global</p>
      <p style="font-size:28px;font-weight:700;margin:0;color:${scoreColor.text};">${globalScore !== null ? globalScore.toFixed(1) : "—"}<span style="font-size:14px;font-weight:500;color:${NOTIF.textSecondary};">/5</span></p>
    </td>`;

  const sentimentCell = `
    <td style="padding:16px 20px;" width="50%">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:${NOTIF.textSecondary};margin:0 0 8px;font-weight:600;">Sentiment</p>
      ${
        sentiment && sentimentColor
          ? `<span style="display:inline-block;font-size:13px;font-weight:600;color:${sentimentColor.text};background:${sentimentColor.bg};padding:4px 12px;border-radius:999px;">${sentiment}</span>`
          : `<span style="font-size:13px;color:${NOTIF.textSecondary};">—</span>`
      }
    </td>`;

  const body = `
    <h1 style="font-size:20px;font-weight:700;color:${NOTIF.textPrimary};margin:0 0 4px;">📊 Analyse de votre rendez-vous</h1>
    <p style="font-size:14px;color:${NOTIF.textSecondary};margin:0 0 20px;">${callTitle}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>${scoreCell}${sentimentCell}</tr>
    </table>
    <h2 style="font-size:16px;font-weight:600;color:${NOTIF.textPrimary};margin:0 0 8px;">💡 Points clés</h2>
    ${
      keyPoints
        ? renderMarkdownForEmail(keyPoints)
        : `<p style="font-size:14px;color:${NOTIF.textSecondary};margin:0 0 20px;">Consultez l'analyse complète pour le détail.</p>`
    }
    ${ctaButtonHtml("Voir l'analyse complète", analysisUrl)}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = `📊 Analyse de votre rendez-vous avec ${contactName ?? callTitle}`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    html: emailShellHtml(body),
  });

  if (error) {
    throw new Error(`sendCallAnalysisEmail failed: ${error.message}`);
  }
}

// ─── Digest hebdomadaire (module Distribution Flexible, sous-étape 3) ──────

function formatScore(score: number | null): string {
  return score !== null ? score.toFixed(1) : "—";
}

// ▲/▼/— against the previous period — same "week-over-week trend" idea as
// getCommercialDetailForManager's `trend` field, just rendered inline here
// instead of as a separate UI element.
function scoreTrendHtml(score: number | null, prevScore: number | null): string {
  if (score === null || prevScore === null) return "";
  const delta = score - prevScore;
  if (Math.abs(delta) < 0.05) return `<span style="font-size:12px;color:${NOTIF.textSecondary};">— stable</span>`;
  const up = delta > 0;
  return `<span style="font-size:12px;font-weight:600;color:${up ? "#15803D" : "#B91C1C"};">${up ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}</span>`;
}

function statCellHtml(label: string, value: string, width = "33%"): string {
  return `
    <td style="padding:14px 16px;background:${NOTIF.card};border-radius:8px;" width="${width}">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:${NOTIF.textSecondary};margin:0 0 6px;font-weight:600;">${label}</p>
      <p style="font-size:22px;font-weight:700;margin:0;color:${NOTIF.textPrimary};">${value}</p>
    </td>`;
}

export async function sendCommercialWeeklyDigestEmail(params: {
  to: string;
  userName: string | null;
  periodLabel: string; // e.g. "1 – 5 juillet 2026"
  narrative: string | null; // markdown, generated from digest_commercial_prompt (lib/admin-config.ts) — see lib/digest.ts
  stats: { calls_count: number; briefs_count: number; avg_score: number | null; prev_avg_score: number | null };
  dashboardUrl: string;
}): Promise<void> {
  const { to, userName, periodLabel, narrative, stats, dashboardUrl } = params;

  const body = `
    <h1 style="font-size:20px;font-weight:700;color:${NOTIF.textPrimary};margin:0 0 4px;">📬 Votre semaine sur Brief</h1>
    <p style="font-size:14px;color:${NOTIF.textSecondary};margin:0 0 24px;">${periodLabel}${userName ? ` — ${userName}` : ""}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        ${statCellHtml("Calls", String(stats.calls_count))}
        <td width="8"></td>
        ${statCellHtml("Briefs générés", String(stats.briefs_count))}
        <td width="8"></td>
        ${statCellHtml("Score moyen", formatScore(stats.avg_score))}
      </tr>
    </table>
    <p style="margin:0 0 24px;">${scoreTrendHtml(stats.avg_score, stats.prev_avg_score)}</p>
    ${narrative ? renderMarkdownForEmail(narrative) : ""}
    ${ctaButtonHtml("Voir mon tableau de bord", dashboardUrl)}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `📬 Votre semaine sur Brief — ${periodLabel}`,
    html: emailShellHtml(body),
  });

  if (error) {
    throw new Error(`sendCommercialWeeklyDigestEmail failed: ${error.message}`);
  }
}

export async function sendManagerWeeklyDigestEmail(params: {
  to: string;
  userName: string | null;
  periodLabel: string;
  narrative: string | null; // markdown, generated from digest_manager_prompt (lib/admin-config.ts) — see lib/digest.ts
  team: Array<{
    name: string | null;
    email: string;
    calls_count: number;
    briefs_count: number;
    avg_score: number | null;
    prev_avg_score: number | null;
  }>;
  teamUrl: string;
}): Promise<void> {
  const { to, userName, periodLabel, narrative, team, teamUrl } = params;

  const totalCalls = team.reduce((sum, t) => sum + t.calls_count, 0);
  const totalBriefs = team.reduce((sum, t) => sum + t.briefs_count, 0);

  const rows = team
    .map(
      (t) => `
        <tr>
          <td style="font-size:13px;color:${NOTIF.textPrimary};padding:8px;border-top:1px solid ${NOTIF.border};">${t.name ?? t.email}</td>
          <td style="font-size:13px;color:${NOTIF.textPrimary};padding:8px;border-top:1px solid ${NOTIF.border};text-align:center;">${t.calls_count}</td>
          <td style="font-size:13px;color:${NOTIF.textPrimary};padding:8px;border-top:1px solid ${NOTIF.border};text-align:center;">${t.briefs_count}</td>
          <td style="font-size:13px;color:${NOTIF.textPrimary};padding:8px;border-top:1px solid ${NOTIF.border};text-align:center;">${formatScore(t.avg_score)} ${scoreTrendHtml(t.avg_score, t.prev_avg_score)}</td>
        </tr>`
    )
    .join("");

  const body = `
    <h1 style="font-size:20px;font-weight:700;color:${NOTIF.textPrimary};margin:0 0 4px;">📬 La semaine de votre équipe</h1>
    <p style="font-size:14px;color:${NOTIF.textSecondary};margin:0 0 24px;">${periodLabel}${userName ? ` — ${userName}` : ""}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        ${statCellHtml("Calls (équipe)", String(totalCalls), "50%")}
        <td width="8"></td>
        ${statCellHtml("Briefs (équipe)", String(totalBriefs), "50%")}
      </tr>
    </table>
    ${narrative ? renderMarkdownForEmail(narrative) : ""}
    ${
      team.length > 0
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <thead><tr>
              <th style="text-align:left;font-size:11px;text-transform:uppercase;color:${NOTIF.textSecondary};padding:6px 8px;border-bottom:1px solid ${NOTIF.border};">Commercial</th>
              <th style="text-align:center;font-size:11px;text-transform:uppercase;color:${NOTIF.textSecondary};padding:6px 8px;border-bottom:1px solid ${NOTIF.border};">Calls</th>
              <th style="text-align:center;font-size:11px;text-transform:uppercase;color:${NOTIF.textSecondary};padding:6px 8px;border-bottom:1px solid ${NOTIF.border};">Briefs</th>
              <th style="text-align:center;font-size:11px;text-transform:uppercase;color:${NOTIF.textSecondary};padding:6px 8px;border-bottom:1px solid ${NOTIF.border};">Score</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>`
        : `<p style="font-size:14px;color:${NOTIF.textSecondary};margin:0 0 24px;">Aucun commercial rattaché pour le moment.</p>`
    }
    ${ctaButtonHtml("Voir mon équipe", teamUrl)}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `📬 La semaine de votre équipe — ${periodLabel}`,
    html: emailShellHtml(body),
  });

  if (error) {
    throw new Error(`sendManagerWeeklyDigestEmail failed: ${error.message}`);
  }
}

// ─── Deal Execution : alertes après un call, email du matin ───────────────
//
// Décisions du 26/10/2026 (reco 11, validée par Hubert) : le commercial reçoit
// les alertes de son call dès que la fiche est prête, le manager la file des
// deals chaque matin, et tout de suite quand le risque est élevé. Le manager
// ne reprend jamais le deal : ce qu'on lui propose passe par le commercial.
// Les fonctions build* rendent le sujet et le HTML sans rien envoyer, pour
// l'aperçu (scripts/preview-deal-emails.ts).

export type DealEmailAlert = { label: string; text: string; verbatim: string | null; speaker: string | null; action: string };

function formatDealAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

function formatDealDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

function dealTagHtml(label: string): string {
  return `<span style="display:inline-block;font-size:12px;font-weight:600;color:#B45309;background:#FEF3C7;padding:3px 10px;border-radius:999px;margin:0 6px 6px 0;">${escapeHtml(label)}</span>`;
}

// Une alerte : ce qui a été relevé, la phrase qui le montre, ce qu'il y a à
// faire. La citation est celle de la fiche, ancrée au transcript.
function dealAlertBlockHtml(alert: DealEmailAlert, actionLabel: string): string {
  const quote = alert.verbatim
    ? `<p style="font-size:13px;line-height:1.55;color:${NOTIF.textSecondary};margin:0 0 10px;padding-left:12px;border-left:3px solid ${NOTIF.border};font-style:italic;">« ${escapeHtml(alert.verbatim)} »${
        alert.speaker ? `<span style="font-style:normal;"> — ${escapeHtml(alert.speaker)}</span>` : ""
      }</p>`
    : "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr><td style="padding:16px 18px;background:${NOTIF.card};border-radius:10px;">
        ${dealTagHtml(alert.label)}
        <p style="font-size:14px;line-height:1.55;color:${NOTIF.textPrimary};margin:4px 0 10px;">${escapeHtml(alert.text)}</p>
        ${quote}
        <p style="font-size:13px;line-height:1.55;color:${NOTIF.textPrimary};margin:0;"><strong>${actionLabel} :</strong> ${escapeHtml(alert.action)}</p>
      </td></tr>
    </table>`;
}

function dealMetaLine(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).map((p) => escapeHtml(p as string)).join(" · ");
}

export function buildDealAlertEmail(params: {
  audience: "commercial" | "manager";
  dealName: string;
  commercialName: string | null;
  callAt: string | null;
  stage: string | null;
  amount: number | null;
  alerts: DealEmailAlert[];
  url: string;
}): { subject: string; html: string } {
  const { audience, dealName, commercialName, callAt, stage, amount, alerts, url } = params;
  const count = alerts.length;
  const meta = dealMetaLine([
    audience === "manager" ? commercialName : null,
    callAt ? `call du ${formatDealDay(callAt)}` : null,
    stage,
    amount != null ? formatDealAmount(amount) : null,
  ]);

  const copy =
    audience === "commercial"
      ? {
          subject: `${count} point${count > 1 ? "s" : ""} à reprendre sur ${dealName}`,
          title: "Ce que votre call laisse ouvert",
          action: "À faire",
          note: "Votre manager voit aussi ces points dans son suivi des deals.",
          cta: "Revoir le call",
        }
      : {
          subject: `Deal à risque : ${dealName}${commercialName ? ` (${commercialName})` : ""}`,
          title: "Un deal se dégrade d'un call à l'autre",
          action: "Intervention proposée",
          note: `${commercialName ? escapeHtml(commercialName) : "Le commercial"} a reçu ces points en même temps que vous. Le deal reste le sien : l'intervention passe par lui.`,
          cta: "Ouvrir les deals à suivre",
        };

  const body = `
    <h1 style="font-size:20px;font-weight:700;color:${NOTIF.textPrimary};margin:0 0 4px;">${copy.title}</h1>
    <p style="font-size:15px;font-weight:600;color:${NOTIF.textPrimary};margin:12px 0 2px;">${escapeHtml(dealName)}</p>
    <p style="font-size:13px;color:${NOTIF.textSecondary};margin:0 0 20px;">${meta}</p>
    ${alerts.map((a) => dealAlertBlockHtml(a, copy.action)).join("")}
    <p style="font-size:13px;line-height:1.55;color:${NOTIF.textSecondary};margin:16px 0 8px;">${copy.note}</p>
    ${ctaButtonHtml(copy.cta, url)}`;

  return { subject: copy.subject, html: emailShellHtml(body) };
}

export type DealMorningEmailDeal = {
  name: string;
  commercialName: string | null;
  stage: string | null;
  amount: number | null;
  alertLabels: string[];
  intervention: string | null;
};

export function buildDealMorningEmail(params: { deals: DealMorningEmailDeal[]; total: number; url: string }): { subject: string; html: string } {
  const { deals, total, url } = params;
  const rows = deals
    .map(
      (d) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr><td style="padding:16px 18px;border:1px solid ${NOTIF.border};border-radius:10px;">
        <p style="font-size:15px;font-weight:600;color:${NOTIF.textPrimary};margin:0 0 2px;">${escapeHtml(d.name)}</p>
        <p style="font-size:13px;color:${NOTIF.textSecondary};margin:0 0 10px;">${dealMetaLine([
          d.commercialName,
          d.stage,
          d.amount != null ? formatDealAmount(d.amount) : null,
        ])}</p>
        <div>${d.alertLabels.map(dealTagHtml).join("")}</div>
        ${
          d.intervention
            ? `<p style="font-size:13px;line-height:1.55;color:${NOTIF.textPrimary};margin:4px 0 0;"><strong>Intervention proposée :</strong> ${escapeHtml(d.intervention)}</p>`
            : ""
        }
      </td></tr>
    </table>`
    )
    .join("");
  const more = total - deals.length;

  const body = `
    <h1 style="font-size:20px;font-weight:700;color:${NOTIF.textPrimary};margin:0 0 4px;">Les deals où intervenir aujourd'hui</h1>
    <p style="font-size:14px;color:${NOTIF.textSecondary};margin:0 0 20px;">Du plus risqué au moins risqué. Chaque commercial reçoit les alertes de ses calls dès que la fiche est prête.</p>
    ${rows}
    ${more > 0 ? `<p style="font-size:13px;color:${NOTIF.textSecondary};margin:4px 0 16px;">Et ${more} autre${more > 1 ? "s" : ""} dans Brief.</p>` : ""}
    <p style="font-size:13px;line-height:1.55;color:${NOTIF.textSecondary};margin:8px 0 8px;">« Vu » retire un deal de cette liste jusqu'à son prochain call, « Plus tard » jusqu'à demain.</p>
    ${ctaButtonHtml("Ouvrir les deals à suivre", url)}`;

  return {
    subject: `${total} deal${total > 1 ? "s" : ""} où intervenir aujourd'hui`,
    html: emailShellHtml(body),
  };
}

export async function sendBuiltEmail(to: string, email: { subject: string; html: string }, scope: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL!, to, subject: email.subject, html: email.html });
  if (error) {
    throw new Error(`${scope} failed: ${error.message}`);
  }
}
