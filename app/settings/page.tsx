import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserProfile } from "@/lib/db";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

  let profile = null;
  if (userId) {
    profile = await getUserProfile(userId);
  }

  console.log("[settings] userId:", userId, "profile:", JSON.stringify(profile));

  return (
    <SettingsClient
      initialProductDescription={profile?.product_description ?? ""}
      initialIcp={profile?.icp ?? ""}
      initialCompanyName={profile?.company_name ?? ""}
    />
  );
}
