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
  searchParams: Promise<{
    company?: string;
    cached?: string;
    contactEmail?: string;
    title?: string;
    startsAt?: string;
    contactName?: string;
  }>;
}) {
  const { id } = await params;
  // PAS de garde isUuid en tête de route ici, contrairement aux autres pages
  // [id] : celle-ci reçoit DEUX formes d'identifiant. Le tableau de bord et les
  // emails de notification pointent vers un identifiant d'événement Google
  // Calendar (`3cb3ps..._20260824T080000Z`), la relecture d'un brief enregistré
  // vers un UUID Supabase. Un garde global renvoyait 404 sur tous les boutons
  // « Préparer le brief » (régression du 19/08/2026). Le garde est descendu sur
  // la seule requête qui interroge une colonne uuid, plus bas.
  const { company, cached, contactEmail, title, startsAt, contactName } = await searchParams;
  // Le nom de l'interlocuteur, quand la liste a pu le fournir (invité d'agenda
  // ou RDV manuel) : c'est lui qui permet de retrouver son poste quand son
  // adresse est inconnue de l'annuaire.
  const decodedContactName = contactName ? decodeURIComponent(contactName) : null;
  const meetingTitle = title ? decodeURIComponent(title) : null;
  const decodedContactEmail = contactEmail ? decodeURIComponent(contactEmail) : null;
  // Date réelle du rendez-vous. La page affichait auparavant `new Date()`,
  // c'est-à-dire l'heure de son propre chargement : un RDV de 9h00 consulté
  // à 16h56 s'annonçait à 16h56. Elle vient de la liste (seule à connaître
  // l'événement d'agenda) ou de la colonne enregistrée (migration 013).
  const startsAtParam = startsAt ? decodeURIComponent(startsAt) : null;

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
            date: (byEvent as { meeting_starts_at?: string | null }).meeting_starts_at ?? startsAtParam ?? "",
            duration: 60,
            // Le nom enregistré prime sur celui de l'URL : quand l'annuaire a
            // résolu la graphie exacte (« BE WTR » pour « Bewtr » saisi), il
            // a été réécrit en base, et c'est lui qui doit s'afficher — sinon
            // un vieux lien continue de nommer la société autrement.
            company: (byEvent as { company_name?: string | null }).company_name ?? decodedCompany,
            // Le titre stocké fait foi ; le paramètre d'URL sert de repli pour
            // un brief enregistré avant la migration 010.
            title: (byEvent as { meeting_title?: string | null }).meeting_title ?? meetingTitle ?? undefined,
            industry: "—",
            contacts: [],
            status: "upcoming",
            brief: adaptCachedContent(byEvent.content),
          };
          // `contactEmail` DOIT être transmis ici aussi, et la valeur stockée
          // prime sur le paramètre d'URL. Sans ça, ouvrir un brief par
          // « Revoir » puis le régénérer renvoyait `contactEmail: null` à
          // l'API, qui l'écrasait en base : le rendez-vous perdait son contact
          // à la première régénération (constaté le 04/09/2026 sur un brief
          // dont le RDV manuel portait pourtant bien l'adresse). Même famille
          // que le bug #31 — une donnée saisie doit rester disponible à
          // TOUTES les étapes suivantes du flux.
          return (
            <BriefClient
              meeting={synthetic}
              contactEmail={byEvent.contact_email ?? decodedContactEmail}
              contactName={decodedContactName}
              callHistory={callHistory}
            />
          );
        }

        // 2e tentative : recherche par UUID de brief Supabase. `briefs.id` est
        // une colonne uuid — l'interroger avec un identifiant d'agenda lève une
        // 22P02 qui remonterait en 500. D'où le garde, ici et pas plus haut.
        const byId = isUuid(id) ? await getBriefByIdForUser(id, userId) : null;
        if (byId?.content) {
          const synthetic: Meeting = {
            id,
            date: byId.meeting_starts_at ?? startsAtParam ?? "",
            duration: 60,
            company: byId.company_name || decodedCompany || "",
            title: byId.meeting_title ?? meetingTitle ?? undefined,
            industry: "—",
            contacts: [],
            status: "upcoming",
            brief: adaptCachedContent(byId.content),
          };
          return (
            <BriefClient
              meeting={synthetic}
              contactEmail={byId.contact_email ?? decodedContactEmail}
              contactName={decodedContactName}
              callHistory={callHistory}
            />
          );
        }
      }
    } catch (err) {
      console.error("[BriefPage] cached lookup failed:", err);
      // Fall through to normal generation
    }
  }

  const synthetic: Meeting = {
    id,
    date: startsAtParam ?? "",
    duration: 60,
    company: decodedCompany,
    title: meetingTitle ?? undefined,
    industry: "—",
    contacts: [],
    status: "upcoming",
  };
  return (
    <BriefClient
      meeting={synthetic}
      autoGenerate
      contactEmail={decodedContactEmail}
      contactName={decodedContactName}
      callHistory={callHistory}
    />
  );
}
