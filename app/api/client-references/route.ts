import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getClientReferences } from "@/lib/db";

// embedding is stripped before returning — it's a 1024-float vector with no
// use on the client, and has_embedding (a plain boolean) is all the UI needs
// to flag references that will never surface in findSimilarReferences.
export async function GET() {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const references = await getClientReferences(auth.userId);
  const sanitized = references.map(({ embedding, ...rest }) => ({
    ...rest,
    has_embedding: embedding != null,
  }));

  return NextResponse.json(sanitized);
}
