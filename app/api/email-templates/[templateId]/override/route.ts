import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import {
  getEmailTemplateOverride,
  upsertEmailTemplateOverride,
  deleteEmailTemplateOverride,
} from "@/lib/db";

// No role check on any of these — unlike /api/email-templates/[templateId]
// (manager-only, edits the shared org template), an override is a personal
// setting: any active org member, commercial or manager, may have one for a
// template they don't own or manage.

export async function GET(request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { templateId } = await params;
  const override = await getEmailTemplateOverride(auth.userId, templateId);
  return NextResponse.json(override);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { templateId } = await params;

  let body: { system_prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!body.system_prompt || !body.system_prompt.trim()) {
    return NextResponse.json({ error: "system_prompt requis." }, { status: 400 });
  }

  try {
    // upsertEmailTemplateOverride re-derives the caller's org and only
    // writes if templateId belongs to it — a user of org A can never create
    // an override on org B's template, even by guessing its id.
    await upsertEmailTemplateOverride(auth.userId, templateId, body.system_prompt.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email-templates/:id/override] upsert failed:", err);
    const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const { templateId } = await params;
  await deleteEmailTemplateOverride(auth.userId, templateId);
  return NextResponse.json({ ok: true });
}
