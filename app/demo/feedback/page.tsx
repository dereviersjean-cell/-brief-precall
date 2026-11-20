import CallLibrary from "@/app/feedback/CallLibrary";
import { demoCalls, DEMO_USER_NAME } from "@/lib/demo-data";
import { nowMs } from "@/lib/format";

export const dynamic = "force-dynamic";

// Le vrai écran « Analyse rendez-vous » (CallLibrary), alimenté par
// lib/demo-data.ts. Il remplace FeedbackClient le 20/11/2026 : cette ancienne
// vue montrait encore la note sur 5 et le filtre « Score sous 3 », retirés du
// produit le 05/11/2026 — la démonstration vendait un écran disparu.
//
// `linksEnabled={false}` : les calls de démonstration n'existent pas en base,
// leurs tuiles ne doivent mener nulle part.
export default function DemoFeedbackPage() {
  return (
    <CallLibrary
      calls={demoCalls}
      dealLinks={{}}
      commercialName={DEMO_USER_NAME}
      people={[]}
      selectedId={null}
      now={nowMs()}
      linksEnabled={false}
    />
  );
}
