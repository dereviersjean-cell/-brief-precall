import { redirect } from "next/navigation";
import { listPendingTasksGrouped } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import TasksListClient from "./TasksListClient";

export default async function TasksPage() {
  const userId = await getEffectiveUserId();
  if (!userId) {
    redirect("/login");
  }

  const grouped = await listPendingTasksGrouped(userId);

  return <TasksListClient initialGrouped={grouped} />;
}
