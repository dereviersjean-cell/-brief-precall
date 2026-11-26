import { NextResponse } from "next/server";
import { recordEmailSend } from "@/lib/db";
import { parseSendBody } from "@/lib/campaign-click";

// Le séquenceur dit au site qu'il vient d'envoyer un mail.
//
// ⚠ À quoi ça sert (26/11/2026) : sans l'heure d'envoi, impossible d'écarter
// les passerelles de sécurité des messageries. Elles ouvrent les liens à la
// place du destinataire, en se présentant comme un Chrome ordinaire — aucune
// liste de robots ne les attrape. Le seul signal qui les trahit est le délai :
// moins de deux minutes après l'envoi, ce n'est pas une personne. La vue
// `clics_humains` (migration 048) fait ce tri.
//
// Le jeton est partagé avec le séquenceur (onglet Réglages du classeur, clé
// CLIC_TOKEN ; ici la variable d'environnement CAMPAIGN_SEND_TOKEN). Tant que
// l'un des deux manque, rien n'est enregistré et rien ne casse : le séquenceur
// continue d'envoyer, et les clics restent simplement non triés.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = process.env.CAMPAIGN_SEND_TOKEN;
  if (!token) {
    console.warn("[campaign/sent] CAMPAIGN_SEND_TOKEN absent : envoi non enregistré");
    return NextResponse.json({ error: "Non configuré." }, { status: 503 });
  }

  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  // Comparaison de longueur constante : un jeton partagé se devine à la
  // milliseconde près quand on compare caractère par caractère.
  if (given.length !== token.length || !timingSafeEqual(given, token)) {
    return NextResponse.json({ error: "Jeton invalide." }, { status: 401 });
  }

  const send = parseSendBody(await request.json().catch(() => null));
  if (!send) return NextResponse.json({ error: "Corps invalide." }, { status: 400 });

  await recordEmailSend(send);
  return NextResponse.json({ ok: true });
}

function timingSafeEqual(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
