import { Resend } from "resend";

// Same hardcoded-origin convention as the rest of the codebase (lib/recall.ts,
// the CRM/Recall OAuth routes) — no NEXT_PUBLIC_APP_URL or equivalent exists.
const APP_URL = "https://brief-precall.vercel.app";

const ROLE_LABELS: Record<"manager" | "commercial", string> = {
  manager: "manager",
  commercial: "commercial",
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
