import { getNonCommercialConfigRaw, getUserProfile } from "@/lib/db";
import { getViewer } from "@/lib/session-user";
import { resolveNonCommercialConfig } from "@/lib/meeting-kind";
import GeneralSettingsClient from "./GeneralSettingsClient";
import NonCommercialSettings from "./NonCommercialSettings";

export default async function GeneralSettingsPage() {
  const viewer = await getViewer();
  const isManager = viewer?.role === "manager" && !!viewer.organizationId;
  const [profile, nonCommercialRaw] = await Promise.all([
    viewer ? getUserProfile(viewer.userId) : Promise.resolve(null),
    isManager ? getNonCommercialConfigRaw(viewer!.organizationId!).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <>
      <GeneralSettingsClient
        initialProductDescription={profile?.product_description ?? ""}
        initialIcp={profile?.icp ?? ""}
        initialCompanyName={profile?.company_name ?? ""}
      />
      {isManager && <NonCommercialSettings initial={resolveNonCommercialConfig(nonCommercialRaw)} />}
    </>
  );
}
