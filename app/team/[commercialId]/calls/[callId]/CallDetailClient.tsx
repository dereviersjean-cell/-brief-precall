"use client";

import type { CallWithAnalysis } from "@/lib/db";
import FeedbackDetailClient from "@/app/feedback/[id]/FeedbackDetailClient";

export default function CallDetailClient({
  call,
  commercialId,
}: {
  call: CallWithAnalysis;
  commercialId: string;
}) {
  return (
    <FeedbackDetailClient
      call={call}
      readOnly
      backHref={`/team/${commercialId}`}
      backLabel="Retour au commercial"
    />
  );
}
