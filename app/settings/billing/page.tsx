import { redirect } from "next/navigation";
import { getEffectiveUserId } from "@/lib/session-user";
import { getUserRole, getOrganizationForUser, getOrganizationBillingRow, getActiveSeatCountForOrganization } from "@/lib/db";
import { getSeatPricesInfo } from "@/lib/stripe";
import BillingSettingsClient from "./BillingSettingsClient";

export default async function BillingSettingsPage() {
  const userId = await getEffectiveUserId();
  if (!userId) redirect("/login");

  const role = await getUserRole(userId);
  if (role !== "manager") redirect("/dashboard");

  const organization = await getOrganizationForUser(userId);
  if (!organization) {
    return (
      <BillingSettingsClient
        organizationName={null}
        billing={null}
        seatCount={0}
        seatPrices={null}
      />
    );
  }

  const [billing, seatCount, seatPrices] = await Promise.all([
    getOrganizationBillingRow(organization.id),
    getActiveSeatCountForOrganization(organization.id),
    getSeatPricesInfo().catch((err) => {
      console.error("[settings/billing] getSeatPricesInfo failed:", err);
      return null;
    }),
  ]);

  return (
    <BillingSettingsClient
      organizationName={organization.name}
      billing={billing}
      seatCount={seatCount}
      seatPrices={seatPrices}
    />
  );
}
