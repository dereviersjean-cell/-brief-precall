import { getUserProfile } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import GeneralSettingsClient from "./GeneralSettingsClient";

export default async function GeneralSettingsPage() {
  const userId = await getEffectiveUserId();
  const profile = userId ? await getUserProfile(userId) : null;

  return (
    <GeneralSettingsClient
      initialProductDescription={profile?.product_description ?? ""}
      initialIcp={profile?.icp ?? ""}
      initialCompanyName={profile?.company_name ?? ""}
    />
  );
}
