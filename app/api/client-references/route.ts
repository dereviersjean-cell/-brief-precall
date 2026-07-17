import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { getClientReferences, createClientReference } from "@/lib/db";

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const client_name = typeof body.client_name === "string" ? body.client_name.trim() : "";
  if (!client_name) {
    return NextResponse.json({ error: "Le nom du client est requis." }, { status: 400 });
  }

  const toNullableString = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const created = await createClientReference(auth.userId, {
    client_name,
    sector: toNullableString(body.sector),
    company_size: toNullableString(body.company_size),
    problem: toNullableString(body.problem),
    solution: toNullableString(body.solution),
    result: toNullableString(body.result),
    raw_text: null,
    source: "manual",
  });

  const { embedding, ...rest } = created;
  return NextResponse.json({ ...rest, has_embedding: embedding != null });
}
