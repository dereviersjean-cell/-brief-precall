import { getContactTimeline } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import ContactTimelineClient from "./ContactTimelineClient";

type Props = { params: Promise<{ email: string }> };

export default async function ContactTimelinePage({ params }: Props) {
  const { email: encodedEmail } = await params;
  const contactEmail = decodeURIComponent(encodedEmail);

  const userId = await getEffectiveUserId();

  const timeline = userId ? await getContactTimeline(userId, contactEmail) : [];

  return <ContactTimelineClient contactEmail={contactEmail} timeline={timeline} />;
}
