import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase";
import { hashPassword, verifyPassword } from "./password";
import type { UserRole } from "./db";

// Connexion et création de compte sans SSO (14/10/2026) : email + mot de
// passe, ou code à 6 chiffres envoyé par email. Branché dans lib/auth.ts
// (deux fournisseurs « credentials ») et dans POST /api/auth/email-code.
//
// RÈGLE DE SÉCURITÉ CENTRALE : un compte n'est créé, et un mot de passe n'est
// défini, qu'après la saisie d'un code — c'est-à-dire la preuve qu'on reçoit
// les emails de l'adresse. Sans elle, n'importe qui pourrait créer un compte
// au nom de quelqu'un d'autre ; et comme une connexion Google se rattache au
// compte de même adresse (resolveUserForLogin), le vrai titulaire hériterait
// en se connectant d'un compte dont un inconnu connaît le mot de passe.

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 5;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// Empreinte liée à l'adresse : un code ne vaut que pour l'email qui l'a reçu.
function codeHash(email: string, code: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

// Crée un code et le renvoie (l'appelant l'envoie par email). Les codes
// précédents encore valides restent utilisables : un email lent ne doit pas
// invalider celui qui vient d'arriver.
export async function createLoginCode(rawEmail: string): Promise<string> {
  const email = normalizeEmail(rawEmail);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await supabaseAdmin.from("auth_email_codes").insert({
    email,
    code_hash: codeHash(email, code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (error) throw error;
  return code;
}

// Vérifie un code : valable, non consommé, moins de 5 essais. Un essai raté
// est compté sur TOUS les codes valides de l'adresse — sinon demander dix
// codes donnerait cinquante essais.
export async function consumeLoginCode(rawEmail: string, rawCode: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return false;

  const { data, error } = await supabaseAdmin
    .from("auth_email_codes")
    .select("id, code_hash, attempts")
    .eq("email", email)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  const rows = (data ?? []) as { id: string; code_hash: string; attempts: number }[];
  const live = rows.filter((r) => r.attempts < CODE_MAX_ATTEMPTS);
  if (live.length === 0) return false;

  const expected = Buffer.from(codeHash(email, code), "hex");
  const match = live.find((r) => {
    const stored = Buffer.from(r.code_hash, "hex");
    return stored.length === expected.length && timingSafeEqual(stored, expected);
  });

  if (!match) {
    await Promise.all(
      live.map((r) => supabaseAdmin.from("auth_email_codes").update({ attempts: r.attempts + 1 }).eq("id", r.id))
    );
    return false;
  }

  // Consommé une seule fois : la mise à jour ne prend que si le code ne
  // l'était pas encore (deux envois simultanés du même code).
  const { data: consumed, error: consumeError } = await supabaseAdmin
    .from("auth_email_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", match.id)
    .is("consumed_at", null)
    .select("id");
  if (consumeError) throw consumeError;
  return (consumed ?? []).length === 1;
}

export type EmailLoginResult = { ok: true; userId: string; role: UserRole | null; name: string | null } | { ok: false; reason: "disabled" | "invalid" };

type UserRow = { id: string; role: UserRole | null; name: string | null; disabled_at: string | null; password_hash: string | null };

async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, role, name, disabled_at, password_hash")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data as UserRow | null;
}

// Un compte existe-t-il pour cette adresse ? Sert à refuser un code de
// connexion ou de réinitialisation pour une adresse inconnue, et une création
// pour une adresse déjà prise (retour de Jean, 14/10/2026).
export async function emailHasAccount(rawEmail: string): Promise<boolean> {
  return (await findUserByEmail(normalizeEmail(rawEmail))) !== null;
}

// Après un code valide : retrouve le compte de l'adresse, ou le crée
// (inscription ouverte, même règle que resolveUserForLogin : sans
// organisation, le middleware l'envoie à l'onboarding). Un nouveau mot de
// passe, s'il est fourni, est enregistré au passage.
export async function signInWithVerifiedEmail(rawEmail: string, newPassword: string | null, name: string | null = null): Promise<EmailLoginResult> {
  const email = normalizeEmail(rawEmail);
  const existing = await findUserByEmail(email);
  const passwordHash = newPassword ? await hashPassword(newPassword) : null;

  if (existing) {
    if (existing.disabled_at) return { ok: false, reason: "disabled" };
    if (passwordHash) {
      const { error } = await supabaseAdmin.from("users").update({ password_hash: passwordHash }).eq("id", existing.id);
      if (error) throw error;
    }
    return { ok: true, userId: existing.id, role: existing.role, name: existing.name };
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({ email, ...(name ? { name } : {}), ...(passwordHash ? { password_hash: passwordHash } : {}) })
    .select("id, role, name")
    .single();
  if (error) throw error;
  const created = data as { id: string; role: UserRole | null; name: string | null };
  return { ok: true, userId: created.id, role: created.role, name: created.name };
}

// Connexion par mot de passe. Même réponse pour « adresse inconnue » et
// « mauvais mot de passe » : la page ne dit pas quelles adresses ont un compte.
export async function signInWithPassword(rawEmail: string, password: string): Promise<EmailLoginResult> {
  const email = normalizeEmail(rawEmail);
  const user = await findUserByEmail(email);
  const valid = await verifyPassword(password, user?.password_hash);
  if (!user || !valid) return { ok: false, reason: "invalid" };
  if (user.disabled_at) return { ok: false, reason: "disabled" };
  return { ok: true, userId: user.id, role: user.role, name: user.name };
}
