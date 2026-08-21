import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getBriefByEventId, getBriefByIdForUser } from "@/lib/db";
import { adaptCachedContent } from "@/lib/brief-content";
import { renderBriefToPdfBuffer } from "@/lib/pdf/BriefDocument";
import { isUuid } from "@/lib/uuid";

// Le brief au format PDF — sert l'export ET le partage : le client récupère
// le même fichier et choisit ensuite de le télécharger ou de le passer à la
// feuille de partage du système.
//
// Comme la page, l'identifiant accepte DEUX formes : un id d'événement Google
// Calendar ou un uuid de brief Supabase. Le garde isUuid protège la seule
// requête qui interroge une colonne uuid — l'interroger avec un id d'agenda
// lèverait une 22P02 remontée en 500.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const row =
    (await getBriefByEventId(auth.userId, id)) ??
    (isUuid(id) ? await getBriefByIdForUser(id, auth.userId) : null);

  if (!row) {
    return NextResponse.json({ error: "Brief introuvable." }, { status: 404 });
  }

  const stored = row as { content: unknown; company_name: string | null; meeting_title?: string | null };
  const title = stored.meeting_title?.trim() || stored.company_name || "Brief";
  const subtitle = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const buffer = await renderBriefToPdfBuffer(title, subtitle, adaptCachedContent(stored.content));

  // Nom de fichier assaini : il devient le nom du fichier partagé par mail ou
  // AirDrop, et un « / » ou un accent mal encodé dans un titre de RDV suffit
  // à casser l'en-tête Content-Disposition.
  const safeName = title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "brief";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Brief - ${safeName}.pdf"`,
    },
  });
}
