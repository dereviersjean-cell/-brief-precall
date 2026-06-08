import { NextRequest, NextResponse } from "next/server";
import { readConfig, writeConfig, AdminConfig } from "@/lib/admin-config";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const config = await readConfig();
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as AdminConfig;
    await writeConfig(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur lors de la sauvegarde." }, { status: 500 });
  }
}
