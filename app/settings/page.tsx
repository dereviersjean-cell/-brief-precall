import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserProfile, getRecallCalendarId, getCrmTokens } from "@/lib/db";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

  let profile = null;
  let recallConnected = false;
  let pipedriveConnected = false;
  let hubspotConnected = false;
  if (userId) {
    const [p, recallCalendarId, pipedriveTokens, hubspotTokens] = await Promise.all([
      getUserProfile(userId),
      getRecallCalendarId(userId),
      getCrmTokens(userId, "pipedrive"),
      getCrmTokens(userId, "hubspot"),
    ]);
    profile = p;
    recallConnected = recallCalendarId !== null;
    pipedriveConnected = pipedriveTokens !== null;
    hubspotConnected = hubspotTokens !== null;
  }

  console.log('[settings] pipedriveConnected:', pipedriveConnected, 'hubspotConnected:', hubspotConnected);

  return (
    <Suspense>
      <SettingsClient
        initialProductDescription={profile?.product_description ?? ""}
        initialIcp={profile?.icp ?? ""}
        initialCompanyName={profile?.company_name ?? ""}
        recallConnected={recallConnected}
        pipedriveConnected={pipedriveConnected}
        hubspotConnected={hubspotConnected}
      />
    </Suspense>
  );
}
