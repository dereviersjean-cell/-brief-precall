import { NextResponse } from "next/server";
import { checkSharedRateLimit, requestIp } from "@/lib/rate-limit";
import { createLoginCode, emailHasAccount, looksLikeEmail, normalizeEmail } from "@/lib/email-auth";
import { sendLoginCodeEmail } from "@/lib/email";
import { reportError } from "@/lib/monitoring";

// Envoi d'un code de connexion (connexion sans SSO, 14/10/2026). Sert aussi
// à créer un compte et à définir son mot de passe — voir lib/email-auth.ts.
//
// Le code n'est envoyé que s'il a un sens : connexion ou mot de passe oublié
// → l'adresse doit avoir un compte ; création → elle ne doit pas en avoir.
// Sinon la page le dit (demande de Jean, 14/10/2026 : envoyer un code de
// réinitialisation à une adresse sans compte n'avait aucun sens). Contrepartie
// assumée : la page révèle si une adresse a un compte. Les limites ci-dessous
// (comptées AVANT la vérification) rendent ce test d'adresses en série lent.
const PER_EMAIL = { max: 5, windowMs: 15 * 60 * 1000 };
const PER_IP = { max: 20, windowMs: 60 * 60 * 1000 };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; intent?: unknown; name?: unknown } | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const intent = body?.intent === "signup" ? "signup" : body?.intent === "reset" ? "reset" : "login";
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
    const hasAccount = await emailHasAccount(email);
    if (intent === "signup" && hasAccount) {
      return NextResponse.json({ error: "account_exists" }, { status: 409 });
    }
    if (intent !== "signup" && !hasAccount) {
      return NextResponse.json({ error: "no_account" }, { status: 404 });
    }
    const code = await createLoginCode(email);
    // Le prénom, saisi sur /inscription, ne sert qu'à saluer dans l'email.
    const firstName = intent === "signup" && typeof body?.name === "string" ? body.name.trim().split(/\s+/)[0]?.slice(0, 40) || null : null;
    await sendLoginCodeEmail({ to: email, code, intent, firstName });
  } catch (err) {
    reportError("auth.email-code", err);
    return NextResponse.json(
      { error: "Impossible d'envoyer le code pour le moment. Réessayez dans un instant." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
