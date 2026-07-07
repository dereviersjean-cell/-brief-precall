import { NextResponse } from "next/server";
import { getImpersonationTarget } from "@/lib/impersonation";

// Deliberately not behind requireActiveUser/isAdminAuthenticated — this is
// what ImpersonationBanner polls from ordinary user pages to know whether to
// render itself, so it must work with only the impersonation cookie present
// and no NextAuth session at all.
export async function GET() {
  const target = await getImpersonationTarget();

  if (!target) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({ active: true, targetUserName: target.name ?? target.email });
}
