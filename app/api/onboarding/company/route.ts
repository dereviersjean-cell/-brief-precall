import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { lookupCompanyRegistry } from "@/lib/company-registry";

// Fiche d'identité de l'entreprise saisie à l'inscription (lib/company-
// registry.ts). Rapide (une fraction de seconde) : l'écran la montre pendant
// que le pré-remplissage par IA travaille. Session obligatoire.
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;
  const name = request.nextUrl.searchParams.get("name")?.trim().slice(0, 200) ?? "";
  if (!name) return NextResponse.json({ company: null });
  const company = await lookupCompanyRegistry(name).catch(() => null);
  return NextResponse.json({ company });
}
