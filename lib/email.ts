import { Resend } from "resend";
import { marked, Renderer } from "marked";

// Same hardcoded-origin convention as the rest of the codebase (lib/recall.ts,
// the CRM/Recall OAuth routes) — no NEXT_PUBLIC_APP_URL or equivalent exists.
const APP_URL = "https://brief-precall.vercel.app";

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

const ROLE_LABELS: Record<"manager" | "commercial", string> = {
  manager: "Manager",
  commercial: "Commercial",
};

function buildInvitationHtml(params: {
  invitedByName: string;
  organizationName: string;
  role: "manager" | "commercial";
}): string {
  const { invitedByName, organizationName, role } = params;
  const loginUrl = `${APP_URL}/login`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #0f172a;">
      <div style="width: 40px; height: 40px; background: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <span style="color: #ffffff; font-weight: bold; font-size: 18px; line-height: 40px; text-align: center; display: block; width: 40px;">B</span>
      </div>
      <h1 style="font-size: 20px; margin: 0 0 16px;">Vous êtes invité(e) à rejoindre Brief</h1>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 12px;">
        <strong>${invitedByName}</strong> a créé un compte pour vous sur Brief, au sein de l'organisation
        <strong>${organizationName}</strong>, avec le rôle <strong>${ROLE_LABELS[role]}</strong>.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
        Connectez-vous avec le même email via Google ou Microsoft pour activer votre compte.
      </p>
      <a href="${loginUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
        Accéder à Brief
      </a>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 32px;">
        Si vous ne vous attendiez pas à cet email, vous pouvez l'ignorer sans risque.
      </p>
    </div>
  `;
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
    subject: "Vous êtes invité(e) à rejoindre Brief",
    html: buildInvitationHtml(params),
  });

  if (error) {
    throw new Error(`sendInvitationEmail failed: ${error.message}`);
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
