import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Mots de passe des comptes sans SSO (connexion email, 14/10/2026). scrypt,
// intégré à Node : pas de dépendance native à compiler sur Vercel. Stocké sous
// la forme « scrypt$<sel>$<empreinte> », en base64 ; jamais le mot de passe.
const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

export const PASSWORD_MIN_LENGTH = 8;

// Règle unique, appliquée à la création comme au changement.
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  if (password.length > 200) return "Le mot de passe est trop long.";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

// Comparaison à temps constant : la durée de la réponse ne dit rien de la
// proximité entre le mot de passe essayé et le bon.
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
