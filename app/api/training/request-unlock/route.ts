import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import {
  getUserName,
  getUserEmail,
  getUserOrganizationId,
  getOrganization,
  hasRecentTrainingUnlockRequest,
  createTrainingUnlockRequest,
  markTrainingUnlockRequestEmailSent,
} from "@/lib/db";
import { sendTrainingUnlockRequestEmail } from "@/lib/email";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

// CTA "Je veux débloquer ce module" sur la page verrouillée d'Entraînement —
// trace la demande en base puis alerte l'admin par email (best-effort : un
// échec d'email ne doit pas faire perdre la demande déjà enregistrée). La
// dédup 24h ne regarde que les demandes dont l'email est réellement parti
// (email_sent) — un échec précédent (ADMIN_NOTIFICATION_EMAIL absente,
// panne Resend) n'empêche donc jamais un nouveau clic de réessayer.
export async function POST() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const sinceISO = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const alreadySent = await hasRecentTrainingUnlockRequest(auth.userId, sinceISO).catch(() => false);
  if (alreadySent) {
    return NextResponse.json({ ok: true, alreadyRequested: true });
  }

  const [userName, userEmail, organizationId] = await Promise.all([
    getUserName(auth.userId),
    getUserEmail(auth.userId),
    getUserOrganizationId(auth.userId),
  ]);
  const organization = organizationId ? await getOrganization(organizationId) : null;

  let requestId: string;
  try {
    const created = await createTrainingUnlockRequest({
      organizationId,
      userId: auth.userId,
      userName,
      userEmail: userEmail ?? "inconnu",
      organizationName: organization?.name ?? null,
    });
    requestId = created.id;
  } catch (err) {
    console.error("[training/request-unlock] createTrainingUnlockRequest failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Impossible d'enregistrer la demande." }, { status: 502 });
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.error("[training/request-unlock] ADMIN_NOTIFICATION_EMAIL non configurée — email non envoyé, demande enregistrée en base (id:", requestId, ").");
    return NextResponse.json({ ok: true, alreadyRequested: false, emailSent: false });
  }

  try {
    await sendTrainingUnlockRequestEmail({
      to: adminEmail,
      userName,
      userEmail: userEmail ?? "inconnu",
      organizationName: organization?.name ?? null,
    });
    await markTrainingUnlockRequestEmailSent(requestId);
    return NextResponse.json({ ok: true, alreadyRequested: false, emailSent: true });
  } catch (err) {
    // La demande est déjà enregistrée en base — un échec d'email ne doit
    // jamais faire échouer la requête côté utilisateur, mais on ne marque
    // pas email_sent : un nouveau clic pourra réessayer sans attendre 24h.
    console.error("[training/request-unlock] sendTrainingUnlockRequestEmail failed (id:", requestId, "):", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: true, alreadyRequested: false, emailSent: false });
  }
}
