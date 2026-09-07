// Backfill : renseigne calls.prospect_company / prospect_contacts (migration
// 015) pour les calls déjà analysés avant le déploiement de
// lib/call-identity.ts.
//
// Sans lui, la liste des calls continue d'afficher un nom déduit de l'adresse
// (« Dereviersjean ») et l'entreprise du rendez-vous sur tous les calls
// existants : l'extraction ne tourne qu'à l'ingestion d'un NOUVEAU call.
//
// Un appel Haiku par call (petit, ~1 c€), donc pas gratuit : la simulation est
// le mode par défaut, --apply écrit réellement. --force retraite les calls qui
// ont déjà une identité (sinon ils sont sautés, ce qui rend le script
// relançable sans re-dépenser).
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/backfill-call-identity.ts [--apply] [--force] [--user=<uuid>]

import { supabaseAdmin } from "../lib/supabase";
import { getUserProfile, updateCallProspectIdentity } from "../lib/db";
import { extractCallIdentity } from "../lib/call-identity";

type Row = {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_email: string | null;
  prospect_company: string | null;
  speaker_names_override: Record<string, string> | null;
  call_analysis: { summary: string | null; key_points: string | null }[] | { summary: string | null; key_points: string | null } | null;
};

function analysisOf(row: Row): { summary: string | null; key_points: string | null } | null {
  // PostgREST rend un OBJET quand la contrainte est 1:1 et un TABLEAU sinon
  // (cf. bug #2) : les deux formes doivent être acceptées ici.
  const a = row.call_analysis;
  if (!a) return null;
  return Array.isArray(a) ? a[0] ?? null : a;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force");
  const userArg = process.argv.find((a) => a.startsWith("--user="))?.split("=")[1] ?? null;

  let query = supabaseAdmin
    .from("calls")
    .select("id, user_id, company_name, contact_email, prospect_company, speaker_names_override, call_analysis(summary, key_points)")
    .order("created_at", { ascending: false });
  if (userArg) query = query.eq("user_id", userArg);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];
  const profileCache = new Map<string, string | null>();
  let done = 0;
  let skipped = 0;

  for (const row of rows) {
    const analysis = analysisOf(row);
    if (!analysis?.summary && !analysis?.key_points) {
      skipped++;
      continue;
    }
    if (row.prospect_company && !force) {
      skipped++;
      continue;
    }

    if (!profileCache.has(row.user_id)) {
      const profile = await getUserProfile(row.user_id);
      profileCache.set(row.user_id, profile?.company_name ?? null);
    }

    const identity = await extractCallIdentity({
      summary: analysis.summary,
      keyPoints: analysis.key_points,
      speakerNames: Object.values(row.speaker_names_override ?? {}),
      commercialCompany: profileCache.get(row.user_id) ?? null,
    });

    if (!identity) {
      console.log(`— ${row.id} : rien d'identifiable (reste sur ${row.company_name || row.contact_email})`);
      skipped++;
      continue;
    }

    console.log(
      `${apply ? "✓" : "·"} ${row.id} : ${identity.prospectCompany ?? "(entreprise inconnue)"} — ${identity.prospectContacts.join(", ") || "(personne identifiée)"}`
    );
    if (apply) await updateCallProspectIdentity(row.id, identity);
    done++;
  }

  console.log(
    `\n${apply ? "Écrits" : "Simulés"} : ${done} · sautés : ${skipped} · total : ${rows.length}` +
      (apply ? "" : "\n(simulation — relancer avec --apply pour écrire)")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
