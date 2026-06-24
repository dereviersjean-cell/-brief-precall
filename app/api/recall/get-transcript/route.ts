import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const transcriptId = request.nextUrl.searchParams.get("transcriptId");
  if (!transcriptId) {
    return NextResponse.json({ error: "transcriptId requis." }, { status: 400 });
  }

  const key = process.env.RECALL_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "RECALL_API_KEY is not set." }, { status: 500 });
  }

  // Step 1 — get transcript metadata (includes download_url)
  const metaRes = await fetch(
    `https://eu-central-1.recall.ai/api/v1/transcript/${transcriptId}/`,
    {
      headers: {
        Authorization: `Token ${key}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!metaRes.ok) {
    return NextResponse.json({ error: `Recall.AI error (${metaRes.status})` }, { status: metaRes.status });
  }

  const meta = await metaRes.json() as Record<string, unknown>;
  const downloadUrl = meta.download_url as string | undefined;

  if (!downloadUrl) {
    return NextResponse.json({ error: "Pas de download_url dans la réponse.", meta });
  }

  // Step 2 — fetch the actual transcript content
  const contentRes = await fetch(downloadUrl);
  if (!contentRes.ok) {
    return NextResponse.json({ error: `download_url fetch failed (${contentRes.status})` }, { status: contentRes.status });
  }

  const content = await contentRes.json();
  return NextResponse.json({ transcriptId, content });
}
