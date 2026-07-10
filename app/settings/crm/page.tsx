import { getCrmTokens } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import CrmSettingsClient from "./CrmSettingsClient";

export default async function CrmSettingsPage() {
  const userId = await getEffectiveUserId();

  let pipedriveConnected = false;
  let hubspotConnected = false;
  if (userId) {
    const [pipedriveTokens, hubspotTokens] = await Promise.all([
      getCrmTokens(userId, "pipedrive"),
      getCrmTokens(userId, "hubspot"),
    ]);
    pipedriveConnected = pipedriveTokens !== null;
    hubspotConnected = hubspotTokens !== null;
  }

  return <CrmSettingsClient pipedriveConnected={pipedriveConnected} hubspotConnected={hubspotConnected} />;
}
