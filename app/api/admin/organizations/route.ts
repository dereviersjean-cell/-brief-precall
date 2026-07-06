import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listOrganizationsWithCounts, createOrganization } from "@/lib/db";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const organizations = await listOrganizationsWithCounts();
  return NextResponse.json(organizations);
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { name } = (await request.json()) as { name?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  }

  const id = await createOrganization(name.trim());
  return NextResponse.json({ id });
}
