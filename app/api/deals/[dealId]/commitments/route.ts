import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { isUuid } from "@/lib/uuid";
import { getCommercialsForManager, getDealPageFiches, isDealMemoryEnabledForOrganization, setCommitmentDone } from "@/lib/db";

// Coche / décoche un engagement « fait » sur la vue Deal (migration 040).
// Le commercial du call ou son manager. Le texte de l'engagement est relu
// dans la fiche, jamais pris dans la requête.
export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;
  if (!auth.organizationId || !(await isDealMemoryEnabledForOrganization(auth.organizationId))) {
    return NextResponse.json({ error: "Indisponible." }, { status: 404 });
  }

  const { dealId } = await params;
  const body = (await request.json().catch(() => null)) as { callId?: unknown; index?: unknown; done?: unknown } | null;
  const callId = typeof body?.callId === "string" ? body.callId : "";
  const index = typeof body?.index === "number" && Number.isInteger(body.index) ? body.index : -1;
  if (!isUuid(dealId) || !isUuid(callId) || index < 0 || typeof body?.done !== "boolean") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const fiches = await getDealPageFiches(dealId, auth.organizationId);
  const fiche = fiches?.find((f) => f.callId === callId);
  const item = fiche?.fields.prochaines_etapes?.[index];
  if (!fiche || !item) return NextResponse.json({ error: "Engagement introuvable." }, { status: 404 });

  const allowed =
    fiche.ownerId === auth.userId ||
    (auth.role === "manager" && (await getCommercialsForManager(auth.userId)).some((c) => c.id === fiche.ownerId));
  if (!allowed) return NextResponse.json({ error: "Engagement introuvable." }, { status: 404 });

  await setCommitmentDone({ dealId, callId, index, text: item.text, userId: auth.userId, done: body.done });
  return NextResponse.json({ ok: true });
}
