import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserProfile, getRecallCalendarId } from "@/lib/db";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

  let profile = null;
  let recallConnected = false;
  if (userId) {
    const [p, recallCalendarId] = await Promise.all([
      getUserProfile(userId),
      getRecallCalendarId(userId),
    ]);
    profile = p;
    recallConnected = recallCalendarId !== null;
  }

  return (
    <Suspense>
      <SettingsClient
        initialProductDescription={profile?.product_description ?? ""}
        initialIcp={profile?.icp ?? ""}
        initialCompanyName={profile?.company_name ?? ""}
        recallConnected={recallConnected}
      />
    </Suspense>
  );
}
