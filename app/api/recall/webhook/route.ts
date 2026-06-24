import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[recall webhook]", JSON.stringify(body));
  } catch {
    console.log("[recall webhook] failed to parse body");
  }

  return NextResponse.json({ received: true });
}
