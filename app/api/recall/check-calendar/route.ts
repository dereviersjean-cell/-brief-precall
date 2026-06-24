import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateRecallToken } from "@/lib/recall";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.supabaseUserId;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let recallToken: string;
  try {
    const tokenData = await generateRecallToken(userId);
    recallToken = tokenData.token;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Recall token generation failed." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch("https://eu-central-1.recall.ai/api/v1/calendar/user/", {
      method: "GET",
      headers: {
        "x-recallcalendarauthtoken": recallToken,
        "Content-Type": "application/json",
      },
    });

    const raw = await res.json() as Record<string, unknown>;
    // Strip any oauth_* fields before returning to the client
    const data = Object.fromEntries(
      Object.entries(raw).filter(([k]) => !k.startsWith("oauth_"))
    );
    return NextResponse.json({ status: res.status, data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
