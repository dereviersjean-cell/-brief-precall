import { PageHeader } from "@/app/components/ui/PageHeader";
import FadeIn from "@/app/dashboard/FadeIn";
import AnalyticsClient from "@/app/dashboard/analytics/AnalyticsClient";
import { demoTeamAnalytics } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

// AnalyticsClient reçoit déjà toutes ses données en props : rien à extraire,
// c'est le vrai composant qui s'affiche ici, avec ses deux familles de
// métriques et son classement par commercial.
export default function DemoAnalyticsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <FadeIn>
        <div className="mb-8">
          <PageHeader
            eyebrow="Performance"
            title="Analytics"
            subtitle="Comment votre équipe conduit ses rendez-vous — 3 derniers mois."
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        {/* showTeamRoster à true : le classement nominatif est tout l'intérêt
            de cet écran, et en démonstration les noms sont fictifs. */}
        <AnalyticsClient analytics={demoTeamAnalytics} currentUserId="demo-u1" showTeamRoster />
      </FadeIn>
    </div>
  );
}
