import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { IMPERSONATION_COOKIE } from "@/lib/impersonation";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let userId: string;
  try {
    ({ userId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId requis." }, { status: 400 });
  }

  const { data: target, error: targetError } = await supabaseAdmin
    .from("users")
    .select("id, disabled_at")
    .eq("id", userId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }
  if ((target as { disabled_at: string | null }).disabled_at != null) {
    return NextResponse.json({ error: "Ce compte est désactivé." }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  // The backoffice uses one shared admin password, not per-admin accounts —
  // there's no finer-grained identifier to log than this.
  const { data: log, error: logError } = await supabaseAdmin
    .from("admin_impersonation_logs")
    .insert({
      target_user_id: userId,
      admin_identifier: "admin",
      ip_address: ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();
  if (logError) throw logError;

  const response = NextResponse.json({ ok: true, logId: (log as { id: string }).id });
  response.cookies.set(IMPERSONATION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Safety cap in case "Terminer l'impersonation" is never clicked
    // (closed tab, crash, etc.) — not required by spec but avoids a
    // forgotten session lingering indefinitely.
    maxAge: 60 * 60 * 4,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const targetUserId = request.cookies.get(IMPERSONATION_COOKIE)?.value;

  if (targetUserId) {
    const { data: openLog, error: findError } = await supabaseAdmin
      .from("admin_impersonation_logs")
      .select("id")
      .eq("target_user_id", targetUserId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findError) throw findError;

    if (openLog) {
      const { error: updateError } = await supabaseAdmin
        .from("admin_impersonation_logs")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", (openLog as { id: string }).id);
      if (updateError) throw updateError;
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(IMPERSONATION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
