import { redirect } from "next/navigation";
import { getUserRole, getUserName, getCommercialsForManager } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import CommercialOverview from "./CommercialOverview";
import ManagerOverview from "./ManagerOverview";
import CommercialSelector from "./CommercialSelector";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ commercial?: string }>;
}) {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, userName] = await Promise.all([getUserRole(userId), getUserName(userId)]);

  if (role !== "manager") {
    return (
      <div className="min-h-screen bg-background">
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
