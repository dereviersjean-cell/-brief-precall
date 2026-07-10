"use client";

import type { CallWithAnalysis } from "@/lib/db";
import type { ConversationAnalytics } from "@/lib/transcript-analytics";
import FeedbackDetailClient from "@/app/feedback/[id]/FeedbackDetailClient";

export default function CallDetailClient({
  call,
  commercialId,
  analytics,
}: {
  call: CallWithAnalysis;
  commercialId: string;
  analytics: ConversationAnalytics | null;
}) {
  return (
    <FeedbackDetailClient
      call={call}
      analytics={analytics}
      readOnly
      backHref={`/team/${commercialId}`}
      backLabel="Retour au commercial"
    />
  );
}
