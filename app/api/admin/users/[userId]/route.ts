import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { softDeleteUser, hardDeleteUser, getRecallCalendarId } from "@/lib/db";
import { deleteRecallCalendar } from "@/lib/recall";

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
      // L'agenda vit chez Recall, hors de la base : lu avant la suppression,
      // supprimé après. Sans ça, le bot continuait de rejoindre les réunions
      // d'un compte qui n'existe plus.
      const calendarId = await getRecallCalendarId(userId).catch(() => null);
      await hardDeleteUser(userId);
      if (calendarId) {
        await deleteRecallCalendar(calendarId).catch((err) =>
          console.error("[admin/users] deleteRecallCalendar failed after hard delete:", err instanceof Error ? err.message : String(err))
        );
      }
    } else {
      await softDeleteUser(userId);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur lors de la suppression.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
