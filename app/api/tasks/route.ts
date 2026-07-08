import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { requireActiveUser } from "@/lib/api-auth";
import { listTasksForUser, listCompletedTasks } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireActiveUser(session);
  if (!auth.ok) return auth.response;

  const filter = request.nextUrl.searchParams.get("filter");

  if (filter === "completed") {
    const tasks = await listCompletedTasks(auth.userId, 20);
    return NextResponse.json(tasks);
  }

  const tasks = await listTasksForUser(auth.userId, "pending");
  return NextResponse.json(tasks);
}
