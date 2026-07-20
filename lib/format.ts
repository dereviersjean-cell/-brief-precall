export function deriveNameFromEmail(email: string): string | null {
  const local = email.split("@")[0];
  if (!local) return null;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
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
