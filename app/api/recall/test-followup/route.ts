import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getGoogleTokens, updateCallFollowUp } from "@/lib/db";
import { refreshGoogleAccessToken, getEmailHistory } from "@/lib/gmail";
import { generateFollowUpEmail } from "@/lib/email-followup";

export async function GET(request: NextRequest) {
  const callId = request.nextUrl.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json({ error: "callId query param required" }, { status: 400 });
  }

  // 1 — fetch call
  const { data: call, error: callErr } = await supabaseAdmin
    .from("calls")
    .select("id, user_id, transcript, contact_email, company_name")
    .eq("id", callId)
    .maybeSingle();

  if (callErr) return NextResponse.json({ error: callErr.message }, { status: 500 });
  if (!call) return NextResponse.json({ error: "call not found" }, { status: 404 });

  const { user_id: userId, transcript, contact_email: contactEmail } = call as {
    user_id: string;
    transcript: string | null;
    contact_email: string | null;
    company_name: string | null;
  };

  if (!transcript) return NextResponse.json({ error: "call has no transcript" }, { status: 400 });
  if (!contactEmail) return NextResponse.json({ error: "call has no contact_email" }, { status: 400 });

  // 2 — fetch next_steps from call_analysis
  const { data: analysis } = await supabaseAdmin
    .from("call_analysis")
    .select("next_steps")
    .eq("call_id", callId)
    .maybeSingle();

  const nextSteps: string[] = (analysis as { next_steps: string[] | null } | null)?.next_steps ?? [];

  // 3 — get Google tokens and refresh
  const { refreshToken } = await getGoogleTokens(userId);
  if (!refreshToken) {
    return NextResponse.json({ error: "no google_refresh_token for this user" }, { status: 400 });
  }

  const freshAccessToken = await refreshGoogleAccessToken(refreshToken);

  // 4 — fetch email history
  const emailHistory = await getEmailHistory(freshAccessToken, contactEmail);

  // 5 — generate follow-up email
  const followUp = await generateFollowUpEmail(transcript, emailHistory, nextSteps, contactEmail);

  // 6 — save
  await updateCallFollowUp(callId, followUp);

  return NextResponse.json({
    callId,
    contactEmail,
    nextStepsUsed: nextSteps,
    emailHistoryCount: emailHistory.length,
    followUp,
  });
}
