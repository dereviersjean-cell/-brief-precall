// Backfill : le conseil de Brief rédigé par Haiku (lib/deal-advice-ai.ts,
// 28/10/2026) pour le DERNIER call de chaque deal d'une organisation — c'est
// le seul que les écrans lisent. Les fiches ne sont pas régénérées.
//
// Un appel Haiku 5.5 par deal (environ 0,002 $). Simulation par défaut : liste
// les deals concernés, sans appel IA ni écriture. `--apply` génère et
// enregistre ; `--force` refait aussi les deals qui ont déjà un conseil.
//
// Depuis la racine du repo :
//   node --env-file=.env.local --experimental-strip-types \
//     --import ./scripts/lib/register-loader.mjs \
//     scripts/backfill-deal-advice.ts --org=<id> [--apply] [--force]

import { supabaseAdmin } from "../lib/supabase";
import { getCallWithAnalysis } from "../lib/db";
import { writeDealAdviceForCall } from "../lib/deal-memory-run";
import type { NextQuestions } from "../lib/deal-memory-schema";

const args = process.argv.slice(2);
const org = args.find((a) => a.startsWith("--org="))?.slice("--org=".length);
const apply = args.includes("--apply");
const force = args.includes("--force");
if (!org) {
  console.error("Usage : --org=<id> [--apply] [--force]");
  process.exit(1);
}

type Row = {
  call_id: string;
  deal_id: string;
  call_at: string | null;
  next_questions: NextQuestions | null;
  calls: { user_id: string } | { user_id: string }[];
};
const { data, error } = await supabaseAdmin
  .from("call_deal_memory")
  .select("call_id, deal_id, call_at, next_questions, calls!inner(user_id)")
  .eq("organization_id", org)
  .not("deal_id", "is", null);
if (error) throw error;

// Le dernier call de chaque deal.
const latest = new Map<string, Row>();
for (const row of (data ?? []) as Row[]) {
  const current = latest.get(row.deal_id);
  if (!current || (row.call_at ?? "") > (current.call_at ?? "")) latest.set(row.deal_id, row);
}
const todo = [...latest.values()].filter((r) => force || !r.next_questions?.advice);
console.log(`${latest.size} deals, ${todo.length} à traiter${apply ? "" : " (simulation, --apply pour générer)"}`);

let done = 0;
for (const row of todo) {
  const ownerId = (Array.isArray(row.calls) ? row.calls[0] : row.calls).user_id;
  if (!apply) {
    console.log(`- deal ${row.deal_id} · call ${row.call_id} du ${row.call_at?.slice(0, 10) ?? "?"}`);
    continue;
  }
  const call = await getCallWithAnalysis(row.call_id, ownerId);
  if (!call) continue;
  const advice = await writeDealAdviceForCall(call, org);
  console.log(`${advice ? "✓" : "✗"} ${row.call_id} ${advice?.next.title ?? "(pas de conseil, voir les logs)"}`);
  if (advice) done++;
}
if (apply) console.log(`${done}/${todo.length} conseils enregistrés`);
