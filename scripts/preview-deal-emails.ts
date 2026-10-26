// Aperçu des emails Deal Execution (migration 033) sur les vraies fiches
// d'une organisation, sans rien envoyer aux destinataires réels.
//
// Construit, pour chaque call ayant une fiche (ou le seul `--call=<id>`),
// l'email du commercial et celui des managers si le risque est élevé ; puis
// l'email du matin de chaque manager. Écrit chaque email en HTML dans
// `--out=<dossier>` (par défaut un dossier temporaire, hors du repo) et
// affiche à qui il serait parti.
// `--send-to=<adresse>` envoie en plus TOUS les emails à cette seule adresse,
// sujet préfixé du vrai destinataire : pour les voir dans une vraie boîte.
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/preview-deal-emails.ts --org=<id> [--call=<id>] [--out=<dossier>] [--send-to=<adresse>]

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { supabaseAdmin } from "../lib/supabase";
import { getActiveManagersInOrganization } from "../lib/db";
import { sendDealAlertsForCall, sendDealMorningEmail, type BuiltDealEmail } from "../lib/deal-alerts";
import { sendBuiltEmail } from "../lib/email";

function arg(name: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
}

async function main() {
  const orgId = arg("org");
  if (!orgId) throw new Error("--org=<id> manquant");
  const onlyCall = arg("call");
  const out = arg("out") ?? join(tmpdir(), "deal-emails-apercu");
  const sendTo = arg("send-to");
  mkdirSync(out, { recursive: true });

  let query = supabaseAdmin
    .from("call_deal_memory")
    .select("call_id, call_at, calls!inner(user_id)")
    .eq("organization_id", orgId)
    .order("call_at", { ascending: true });
  if (onlyCall) query = query.eq("call_id", onlyCall);
  const { data, error } = await query;
  if (error) throw error;

  const built: { file: string; email: BuiltDealEmail }[] = [];
  for (const row of (data ?? []) as { call_id: string; calls: { user_id: string } | { user_id: string }[] }[]) {
    const userId = Array.isArray(row.calls) ? row.calls[0]?.user_id : row.calls.user_id;
    if (!userId) continue;
    const emails = await sendDealAlertsForCall(row.call_id, userId, { send: false });
    emails.forEach((email, i) => built.push({ file: `apres-call-${row.call_id.slice(0, 8)}-${i}.html`, email }));
  }

  if (!onlyCall) {
    for (const manager of await getActiveManagersInOrganization(orgId)) {
      const email = await sendDealMorningEmail(manager, orgId, { send: false });
      if (email) built.push({ file: `matin-${manager.id.slice(0, 8)}.html`, email });
      else console.log(`matin — ${manager.email} : rien à signaler, pas d'email`);
    }
  }

  for (const { file, email } of built) {
    writeFileSync(join(out, file), `<!doctype html><meta charset="utf-8"><title>${email.subject}</title>${email.html}`);
    console.log(`${file} — à ${email.to} — « ${email.subject} »`);
    if (sendTo) await sendBuiltEmail(sendTo, { subject: `[aperçu → ${email.to}] ${email.subject}`, html: email.html }, "preview-deal-emails");
  }
  console.log(`\n${built.length} email(s) écrit(s) dans ${out}/${sendTo ? `, envoyé(s) à ${sendTo}` : " (rien d'envoyé)"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
