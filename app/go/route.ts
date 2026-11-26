import { NextResponse } from "next/server";
import { APP_URL } from "@/lib/app-url";
import { campaignDestination, looksAutomated, parseCampaignClick } from "@/lib/campaign-click";
import { recordEmailClick } from "@/lib/db";

// Porte d'entrée des liens de campagne : on note le passage, puis on envoie
// le prospect sur le site.
//
// ⚠ Pourquoi cette route existe (26/11/2026) : les mails portent
// `?utm_campaign=c2&utm_content=mail1&r=<id du contact>`. Vercel Web Analytics
// ne filtre les UTM qu'avec son option payante et ne retient aucun paramètre
// libre — `r` y disparaît, donc on ne saurait jamais QUI a cliqué, ce qui est
// tout l'intérêt du balisage. Une table à nous règle la question sans plan
// payant, et survivra au prochain changement d'outil d'audience.
//
// Publique à dessein : elle n'est pas dans le matcher de middleware.ts, comme
// /microsoft-autorise. Un prospect n'a pas de compte Brief.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  // La destination est calculée AVANT l'écriture : quoi qu'il arrive ensuite,
  // la personne arrive sur le site.
  const destination = campaignDestination(url, `${APP_URL}/`);

  const click = parseCampaignClick(url);
  const userAgent = request.headers.get("user-agent");
  await recordEmailClick({
    ...click,
    referrer: request.headers.get("referer"),
    userAgent,
    automated: looksAutomated(userAgent),
  });

  // 302 et non 301 : un 301 se met en cache dans le navigateur, et le
  // deuxième clic de la même personne ne reviendrait jamais jusqu'ici.
  return NextResponse.redirect(destination, 302);
}
