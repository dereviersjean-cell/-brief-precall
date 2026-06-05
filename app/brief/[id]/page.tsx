import { notFound } from "next/navigation";
import { getMeetingById } from "@/lib/mock-data";
import { Meeting } from "@/lib/types";
import BriefClient from "./BriefClient";

export default async function BriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ company?: string }>;
}) {
  const { id } = await params;
  const { company } = await searchParams;

  const meeting = getMeetingById(id);

  if (meeting) {
    return <BriefClient meeting={meeting} />;
  }

  if (company) {
    const synthetic: Meeting = {
      id,
      date: new Date().toISOString(),
      duration: 60,
      company: decodeURIComponent(company),
      industry: "—",
      contacts: [],
      status: "upcoming",
    };
    return <BriefClient meeting={synthetic} autoGenerate />;
  }

  notFound();
}
