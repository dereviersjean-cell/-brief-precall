import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUserContext } from "@/lib/api-auth";
import { getOrganizationDealRules, isDealMemoryEnabledForOrganization, setOrganizationDealRules } from "@/lib/db";
import { coerceDealRules } from "@/lib/deal-rules";

// Les règles des deals de l'organisation (lib/deal-rules.ts, migration 036) :
// lues par tout manager des organisations en test, modifiées par lui.
async function guard() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUserContext(session);
  if (!auth.ok) return { response: auth.response } as const;
  if (auth.role !== "manager" || !auth.organizationId || !(await isDealMemoryEnabledForOrganization(auth.organizationId))) {
    return { response: NextResponse.json({ error: "Règles indisponibles." }, { status: 404 }) } as const;
  }
  return { organizationId: auth.organizationId } as const;
}

export async function GET() {
  const g = await guard();
  if ("response" in g) return g.response;
  return NextResponse.json({ rules: await getOrganizationDealRules(g.organizationId) });
}

export async function PUT(request: Request) {
  const g = await guard();
  if ("response" in g) return g.response;
  const body = (await request.json().catch(() => null)) as { rules?: unknown } | null;
  // Toujours ramenées à des règles valides : bornes, méthode et champs connus.
  const rules = coerceDealRules(body?.rules ?? null);
  try {
    await setOrganizationDealRules(g.organizationId, rules);
  } catch {
    return NextResponse.json({ error: "Enregistrement impossible : la migration 036 est-elle passée ?" }, { status: 500 });
  }
  return NextResponse.json({ rules });
}
