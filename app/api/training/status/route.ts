import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { isTrainingEnabledForOrganization } from "@/lib/db";

// Lu par PerformanceTabs (client) pour griser l'onglet Entraînement quand le
// module n'est pas débloqué pour l'organisation — purement visuel, le vrai
// gate est sur /training lui-même et les 4 routes /api/training/*.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return auth.response;

  const organizationId = auth.organizationId;
  const enabled = organizationId ? await isTrainingEnabledForOrganization(organizationId) : false;
  return NextResponse.json({ enabled });
}
