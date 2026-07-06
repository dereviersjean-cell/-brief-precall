import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserRole, getOrganizationCommercialsForManager } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const role = await getUserRole(userId);
  if (role !== "manager") {
    return NextResponse.json({ error: "Réservé aux managers." }, { status: 403 });
  }

  const commercials = await getOrganizationCommercialsForManager(userId);
  return NextResponse.json(commercials);
}
