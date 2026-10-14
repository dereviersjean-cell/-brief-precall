import { NextResponse } from "next/server";
import { checkSharedRateLimit, requestIp } from "@/lib/rate-limit";
import { createLoginCode, looksLikeEmail, normalizeEmail } from "@/lib/email-auth";
import { sendLoginCodeEmail } from "@/lib/email";
import { reportError } from "@/lib/monitoring";

// Envoi d'un code de connexion (connexion sans SSO, 14/10/2026). Sert aussi
// à créer un compte et à définir son mot de passe — voir lib/email-auth.ts.
//
// La réponse est la même que l'adresse ait un compte ou non : la page ne doit
// pas permettre de savoir qui utilise Brief.
const PER_EMAIL = { max: 5, windowMs: 15 * 60 * 1000 };
const PER_IP = { max: 20, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!looksLikeEmail(email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  const [byIp, byEmail] = await Promise.all([
    checkSharedRateLimit(`email-code-ip:${requestIp(request)}`, PER_IP),
    checkSharedRateLimit(`email-code:${email}`, PER_EMAIL),
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    return NextResponse.json(
      { error: "Trop de codes demandés. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  try {
    const code = await createLoginCode(email);
    await sendLoginCodeEmail({ to: email, code });
  } catch (err) {
    reportError("auth.email-code", err);
    return NextResponse.json(
      { error: "Impossible d'envoyer le code pour le moment. Réessayez dans un instant." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
