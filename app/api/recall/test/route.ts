import { NextResponse } from "next/server";
import { getRecallStatus } from "@/lib/recall";

export async function GET() {
  try {
    const result = await getRecallStatus();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
