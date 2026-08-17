import { redirect } from "next/navigation";
import { getUserRole, getUserName, getCommercialsForManager, getActivationState } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import CommercialOverview from "./CommercialOverview";
import ManagerOverview from "./ManagerOverview";
import CommercialSelector from "./CommercialSelector";
import ActivationBanner from "./ActivationBanner";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ commercial?: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, userName, activation] = await Promise.all([
    getUserRole(userId),
    getUserName(userId),
    // Ne doit jamais faire tomber le tableau de bord : le bandeau est un
    // rappel, pas une fonctionnalité.
    getActivationState(userId).catch(() => ({ steps: [], completed: 0, total: 0 })),
  ]);

  if (role !== "manager") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-6 pt-6">
          <ActivationBanner activation={activation} />
        </div>
        <CommercialOverview userId={userId} userName={userName} />
      </div>
    );
  }

  // Vue équipe par défaut ; ?commercial=<id> bascule sur la vue individuelle
  // d'un commercial précis. getCommercialsForManager fait déjà l'autorisation
  // (uniquement les commerciaux liés à ce manager, même organisation) — un id
  // absent de cette liste retombe silencieusement sur la vue équipe plutôt
  // que d'exposer les données d'un commercial non géré par ce manager.
  const { commercial: selectedId } = await searchParams;
  const commercials = await getCommercialsForManager(userId);
  const selected = selectedId ? commercials.find((c) => c.id === selectedId) ?? null : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <ActivationBanner activation={activation} />
        <CommercialSelector commercials={commercials} selectedId={selected?.id ?? null} />
      </div>
      {selected ? (
        <CommercialOverview userId={selected.id} userName={selected.name} viewerRole="manager" />
      ) : (
        <ManagerOverview userId={userId} userName={userName} />
      )}
    </div>
  );
}
