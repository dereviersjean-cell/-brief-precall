import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getMeetingById } from "@/lib/mock-data";
import { getBriefByEventId, getBriefById } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { Meeting, Brief, NewsItem } from "@/lib/types";
import BriefClient from "./BriefClient";

function adaptCachedContent(content: unknown): Brief {
  const api = content as {
    overview?: string;
    accroche?: string;
    pain_points?: Array<{ title: string; detail: string }>;
    arguments?: Array<{ title: string; detail: string }>;
    vocabulaire?: string[];
    actualites?: NewsItem[];
  };
  return {
    companyOverview: api.overview ?? "",
    suggestedOpeningLine: api.accroche ?? "",
    painPoints: api.pain_points ?? [],
    talkingPoints: api.arguments ?? [],
    recentNews: [],
    objectives: [],
    keywords: api.vocabulaire ?? [],
    actualites: api.actualites,
  };
}

export default async function BriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ company?: string; cached?: string }>;
}) {
  const { id } = await params;
  const { company, cached } = await searchParams;

  // Mock data takes priority
  const meeting = getMeetingById(id);
  if (meeting) {
    return <BriefClient meeting={meeting} />;
  }

  if (!company) {
    notFound();
  }

  const decodedCompany = decodeURIComponent(company);

  // cached=true : charger le brief depuis Supabase avant de passer à Claude
  if (cached === "true") {
    try {
      const session = await getServerSession(authOptions);
      const userId = session?.supabaseUserId;
      if (userId) {
        // 1st attempt : lookup by calendar_event_id
        const byEvent = await getBriefByEventId(userId, id);
        if (byEvent?.content) {
          const synthetic: Meeting = {
            id,
            date: new Date().toISOString(),
            duration: 60,
            company: decodedCompany,
            industry: "—",
            contacts: [],
            status: "upcoming",
            brief: adaptCachedContent(byEvent.content),
          };
          return <BriefClient meeting={synthetic} />;
        }

        // 2nd attempt : lookup by Supabase brief UUID
        const byId = await getBriefById(id);
        if (byId?.content) {
          const synthetic: Meeting = {
            id,
            date: new Date().toISOString(),
            duration: 60,
            company: decodedCompany || byId.company_name || "",
            industry: "—",
            contacts: [],
            status: "upcoming",
            brief: adaptCachedContent(byId.content),
          };
          return <BriefClient meeting={synthetic} />;
        }
      }
    } catch {
      // Fall through to normal generation
    }
  }

  const synthetic: Meeting = {
    id,
    date: new Date().toISOString(),
    duration: 60,
    company: decodedCompany,
    industry: "—",
    contacts: [],
    status: "upcoming",
  };
  return <BriefClient meeting={synthetic} autoGenerate />;
}
