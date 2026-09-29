import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { setEnabledModulesForOrganization } from "@/lib/db";
import { isModuleKey } from "@/lib/modules";

// Modules ouverts pour une organisation (parcours client, lib/modules.ts).
// Reçoit la liste COMPLÈTE : elle remplace la précédente et devient
// explicite, y compris pour une organisation antérieure au parcours.
// Remplace l'ancien interrupteur Entraînement (training_enabled), que la
// liste tient aligné.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { orgId } = await params;
  let modules: unknown;
  try {
    ({ modules } = (await request.json()) as { modules: unknown });
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!Array.isArray(modules) || !modules.every(isModuleKey)) {
    return NextResponse.json({ error: "modules : liste de clés de module attendue." }, { status: 400 });
  }

  try {
    await setEnabledModulesForOrganization(orgId, [...new Set(modules)]);
  } catch (err) {
    // Colonne absente : la migration 019 n'est pas encore passée.
    const code = (err as { code?: string } | null)?.code;
    if (code === "42703" || code === "PGRST204") {
      return NextResponse.json(
        { error: "La migration 019 (modules par organisation) n'est pas encore passée sur Supabase." },
        { status: 409 }
      );
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
