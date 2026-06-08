import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { generateBrief } from "@/lib/brief-generator";
import { AdminConfig } from "@/lib/admin-config";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let company: string;
  let config: AdminConfig;
  try {
    ({ company, config } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  if (!company?.trim()) {
    return NextResponse.json({ error: "Le paramètre 'company' est requis." }, { status: 400 });
  }

  try {
    const brief = await generateBrief(company.trim(), config);
    return NextResponse.json(brief);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Clé API invalide." }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Limite API atteinte." }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : "Erreur interne.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
