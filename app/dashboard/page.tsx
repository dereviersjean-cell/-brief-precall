import { redirect } from "next/navigation";
import { getUserRole, getUserName } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import CommercialOverview from "./CommercialOverview";
import ManagerOverview from "./ManagerOverview";

export default async function DashboardPage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const [role, userName] = await Promise.all([getUserRole(userId), getUserName(userId)]);

  return (
    <div className="min-h-screen bg-background">
      {role === "manager" ? (
        <ManagerOverview userId={userId} userName={userName} />
      ) : (
        <CommercialOverview userId={userId} userName={userName} />
      )}
    </div>
  );
}
