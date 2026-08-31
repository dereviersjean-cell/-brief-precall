import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { enforceAiGenerationLimit, requestIp, retryAfterMinutes } from "@/lib/rate-limit";
import { getUserRole, getUserOrganizationId, getPlaybookNotionConnection } from "@/lib/db";
import { getNotionPageText } from "@/lib/notion";
import { extractPlaybookDimensions } from "@/app/api/playbook/import/route";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const rl = await enforceAiGenerationLimit(requestIp(request), auth.userId);
  if (!rl.allowed) {
    const minutes = retryAfterMinutes(rl.retryAfterMs);
    return NextResponse.json(
      { error: `Limite de génération IA atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`, retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  const role = await getUserRole(auth.userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const orgId = await getUserOrganizationId(auth.userId);
  if (!orgId) {
    return NextResponse.json({ error: "Vous devez être rattaché à une organisation." }, { status: 400 });
  }

  const connection = await getPlaybookNotionConnection(orgId);
  if (!connection) {
    return NextResponse.json({ error: "Notion non connecté." }, { status: 400 });
  }

  let pageId: string;
  try {
    ({ pageId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (typeof pageId !== "string" || !pageId.trim()) {
    return NextResponse.json({ error: "pageId requis." }, { status: 400 });
  }

  let text: string;
  try {
    text = await getNotionPageText(connection.access_token, pageId.trim());
  } catch (err) {
    console.error("[playbook/notion/import] page fetch failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Impossible de récupérer le contenu de cette page Notion." }, { status: 502 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Cette page Notion semble vide." }, { status: 400 });
  }

  try {
    const dimensions = await extractPlaybookDimensions(text);
    return NextResponse.json({ dimensions });
  } catch (err) {
    console.error("[playbook/notion/import] extraction failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "L'extraction a échoué. Réessayez, ou importez ce contenu via copier-coller." },
      { status: 500 }
    );
  }
}
