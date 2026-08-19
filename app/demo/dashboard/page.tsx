import CommercialOverviewView from "@/app/dashboard/CommercialOverviewView";
import { DEMO_USER_NAME, demoWeekStats, demoTrendWeeks, demoRecentCalls, demoContacts } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

// `userId` à null : ConnectionsStatus lit la base et n'a rien à faire ici.
// La vue le gère explicitement plutôt que de recevoir un identifiant bidon.
export default function DemoDashboardPage() {
  return (
    <CommercialOverviewView
      userId={null}
      userName={DEMO_USER_NAME}
      viewerRole="self"
      now={new Date()}
      weekStats={demoWeekStats}
      trendWeeks={demoTrendWeeks}
      last5Calls={demoRecentCalls}
      topContacts={demoContacts}
      linksEnabled={false}
    />
  );
}
