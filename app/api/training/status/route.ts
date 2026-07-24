import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getUserOrganizationId, isTrainingEnabledForOrganization } from "@/lib/db";

// Lu par PerformanceTabs (client) pour griser l'onglet Entraînement quand le
// module n'est pas débloqué pour l'organisation — purement visuel, le vrai
// gate est sur /training lui-même et les 4 routes /api/training/*.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const organizationId = await getUserOrganizationId(auth.userId);
  const enabled = organizationId ? await isTrainingEnabledForOrganization(organizationId) : false;
  return NextResponse.json({ enabled });
}
