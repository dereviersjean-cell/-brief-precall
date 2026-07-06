import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { softDeleteUser, hardDeleteUser } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { userId } = await params;
  const mode = request.nextUrl.searchParams.get("mode") === "hard" ? "hard" : "soft";

  try {
    if (mode === "hard") {
      await hardDeleteUser(userId);
    } else {
      await softDeleteUser(userId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
