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
} from "@/lib/db";
import { sendTrainingUnlockRequestEmail } from "@/lib/email";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

// CTA "Je veux débloquer ce module" sur la page verrouillée d'Entraînement —
// trace la demande en base puis alerte l'admin par email (best-effort : un
// échec d'email ne doit pas faire perdre la demande déjà enregistrée).
export async function POST() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const sinceISO = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const alreadyRequested = await hasRecentTrainingUnlockRequest(auth.userId, sinceISO).catch(() => false);
  if (alreadyRequested) {
    return NextResponse.json({ ok: true, alreadyRequested: true });
  }

  const [userName, userEmail, organizationId] = await Promise.all([
    getUserName(auth.userId),
    getUserEmail(auth.userId),
    getUserOrganizationId(auth.userId),
  ]);
  const organization = organizationId ? await getOrganization(organizationId) : null;

  try {
    await createTrainingUnlockRequest({
      organizationId,
      userId: auth.userId,
      userName,
      userEmail: userEmail ?? "inconnu",
      organizationName: organization?.name ?? null,
    });
  } catch (err) {
    console.error("[training/request-unlock] createTrainingUnlockRequest failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Impossible d'enregistrer la demande." }, { status: 502 });
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    try {
      await sendTrainingUnlockRequestEmail({
        to: adminEmail,
        userName,
        userEmail: userEmail ?? "inconnu",
        organizationName: organization?.name ?? null,
      });
    } catch (err) {
      // La demande est déjà enregistrée en base — un échec d'email ne doit
      // jamais faire échouer la requête côté utilisateur.
      console.error("[training/request-unlock] sendTrainingUnlockRequestEmail failed (non-blocking):", err instanceof Error ? err.message : String(err));
    }
  } else {
    console.error("[training/request-unlock] ADMIN_NOTIFICATION_EMAIL non configurée — email non envoyé, demande tout de même enregistrée en base.");
  }

  return NextResponse.json({ ok: true, alreadyRequested: false });
}
