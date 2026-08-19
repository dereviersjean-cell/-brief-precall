import FeedbackClient from "@/app/feedback/FeedbackClient";
import { demoCalls } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

// FeedbackClient prend `calls` en props : c'est le vrai écran, avec ses
// filtres, sa recherche et ses badges de score.
export default function DemoFeedbackPage() {
  return (
    <FeedbackClient calls={demoCalls} linksEnabled={false} />
  );
}
