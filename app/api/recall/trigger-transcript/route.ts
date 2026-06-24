import { NextRequest, NextResponse } from "next/server";
import { createAsyncTranscript } from "@/lib/recall";

export async function GET(request: NextRequest) {
  const recordingId = request.nextUrl.searchParams.get("recordingId");
  if (!recordingId) {
    return NextResponse.json({ error: "recordingId requis." }, { status: 400 });
  }

  try {
    const result = await createAsyncTranscript(recordingId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
