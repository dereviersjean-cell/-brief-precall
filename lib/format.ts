export function deriveNameFromEmail(email: string): string | null {
  const local = email.split("@")[0];
  if (!local) return null;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

// Étiquettes que resolveSpeakerNames (lib/recall.ts) pose quand il n'a PAS
// identifié la personne : les afficher comme nom de prospect serait pire que
// le nom déduit de l'adresse.
const UNRESOLVED_SPEAKER_LABELS = new Set(["Participant non identifié", "Commercial"]);

/**
 * Les participants EXTERNES d'un call, d'après les noms réels relevés en visio
 * (calls.speaker_names_override, alimenté à l'ingestion par resolveSpeakerNames
 * puis corrigeable à la main sur la page de détail).
 *
 * C'est la seule source d'un vrai nom de personne : la base ne stocke aucun
 * nom de contact, et le déduire de l'adresse donne « Dereviersjean » pour
 * « dereviersjean@gmail.com ».
 *
 * Le commercial lui-même est retiré — c'est lui qui regarde l'écran. L'ordre
 * est celui de Recall, pas un classement : quand il reste plusieurs personnes,
 * l'appelant doit dire qu'il y en a d'autres plutôt que de faire passer la
 * première pour l'interlocuteur principal, qu'on ne sait pas désigner.
 */
export function externalSpeakerNames(
  speakerNames: Record<string, string> | null | undefined,
  commercialName: string | null | undefined
): string[] {
  if (!speakerNames) return [];
  const mine = commercialName?.trim().toLowerCase() ?? null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of Object.values(speakerNames)) {
    const name = raw?.trim();
    if (!name || UNRESOLVED_SPEAKER_LABELS.has(name)) continue;
    // Une valeur qui n'est qu'une adresse email n'apprend rien de plus que le
    // repli habituel, et afficherait justement ce qu'on cherche à éviter.
    if (name.includes("@")) continue;
    const key = name.toLowerCase();
    if (key === mine || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * No contact name is stored in the DB (calls/contacts only have contact_email + company_name),
 * so the prospect name is approximated from the email's local part when no company name is set.
 */
export function formatContactDisplayName(
  companyName: string | null | undefined,
  contactEmail: string | null | undefined
): string {
  const company = companyName?.trim() || null;
  const nameFromEmail = contactEmail ? deriveNameFromEmail(contactEmail) : null;

  if (company && nameFromEmail) return `${company} - ${nameFromEmail}`;
  if (company) return company;
  if (nameFromEmail) return nameFromEmail;
  if (contactEmail) return contactEmail;
  return "Contact inconnu";
}
