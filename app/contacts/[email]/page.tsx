import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getContactTimeline } from "@/lib/db";
import ContactTimelineClient from "./ContactTimelineClient";

type Props = { params: Promise<{ email: string }> };

export default async function ContactTimelinePage({ params }: Props) {
  const { email: encodedEmail } = await params;
  const contactEmail = decodeURIComponent(encodedEmail);

  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

  const timeline = userId ? await getContactTimeline(userId, contactEmail) : [];

  return <ContactTimelineClient contactEmail={contactEmail} timeline={timeline} />;
}
