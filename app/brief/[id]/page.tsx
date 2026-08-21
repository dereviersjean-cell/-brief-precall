import { notFound } from "next/navigation";
import { isUuid } from "@/lib/uuid";
import { getBriefByEventId, getBriefByIdForUser, getRecentCallsForContact, CallHistoryItem } from "@/lib/db";
import { adaptCachedContent } from "@/lib/brief-content";
import { getEffectiveUserId } from "@/lib/session-user";
import { Meeting } from "@/lib/types";
import BriefClient from "./BriefClient";


export default async function BriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ company?: string; cached?: string; contactEmail?: string; title?: string }>;
}) {
  const { id } = await params;
  // PAS de garde isUuid en tête de route ici, contrairement aux autres pages
  // [id] : celle-ci reçoit DEUX formes d'identifiant. Le tableau de bord et les
  // emails de notification pointent vers un identifiant d'événement Google
  // Calendar (`3cb3ps..._20260824T080000Z`), la relecture d'un brief enregistré
  // vers un UUID Supabase. Un garde global renvoyait 404 sur tous les boutons
  // « Préparer le brief » (régression du 19/08/2026). Le garde est descendu sur
  // la seule requête qui interroge une colonne uuid, plus bas.
  const { company, cached, contactEmail, title } = await searchParams;
  const meetingTitle = title ? decodeURIComponent(title) : null;
  const decodedContactEmail = contactEmail ? decodeURIComponent(contactEmail) : null;

  if (!company) {
    notFound();
  }

  const decodedCompany = decodeURIComponent(company!);

  const userId = await getEffectiveUserId();

  let callHistory: CallHistoryItem[] = [];
  if (userId && decodedContactEmail) {
    try {
      callHistory = await getRecentCallsForContact(userId, decodedContactEmail);
    } catch {
      // non-blocking
    }
  }

  // cached=true : charger le brief depuis Supabase avant de passer à Claude
  if (cached === "true") {
    try {
      if (userId) {
        // 1st attempt : lookup by calendar_event_id
        const byEvent = await getBriefByEventId(userId, id);
        if (byEvent?.content) {
          const synthetic: Meeting = {
            id,
            date: new Date().toISOString(),
            duration: 60,
            company: decodedCompany,
            // Le titre stocké fait foi ; le paramètre d'URL sert de repli pour
            // un brief enregistré avant la migration 010.
            title: (byEvent as { meeting_title?: string | null }).meeting_title ?? meetingTitle ?? undefined,
            industry: "—",
            contacts: [],
            status: "upcoming",
            brief: adaptCachedContent(byEvent.content),
          };
          return <BriefClient meeting={synthetic} callHistory={callHistory} />;
        }

        // 2e tentative : recherche par UUID de brief Supabase. `briefs.id` est
        // une colonne uuid — l'interroger avec un identifiant d'agenda lève une
        // 22P02 qui remonterait en 500. D'où le garde, ici et pas plus haut.
        const byId = isUuid(id) ? await getBriefByIdForUser(id, userId) : null;
        if (byId?.content) {
          const synthetic: Meeting = {
            id,
            date: new Date().toISOString(),
            duration: 60,
            company: decodedCompany || byId.company_name || "",
            title: byId.meeting_title ?? meetingTitle ?? undefined,
            industry: "—",
            contacts: [],
            status: "upcoming",
            brief: adaptCachedContent(byId.content),
          };
          return <BriefClient meeting={synthetic} callHistory={callHistory} />;
        }
      }
    } catch (err) {
      console.error("[BriefPage] cached lookup failed:", err);
      // Fall through to normal generation
    }
  }

  const synthetic: Meeting = {
    id,
    date: new Date().toISOString(),
    duration: 60,
    company: decodedCompany,
    title: meetingTitle ?? undefined,
    industry: "—",
    contacts: [],
    status: "upcoming",
  };
  return <BriefClient meeting={synthetic} autoGenerate contactEmail={decodedContactEmail} callHistory={callHistory} />;
}
