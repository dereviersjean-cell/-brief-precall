import { redirect } from "next/navigation";
import { ensureDefaultTaskTemplates, listTaskTemplates } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import TaskTemplatesClient from "./TaskTemplatesClient";

export default async function TaskSettingsPage() {
  const userId = await getEffectiveUserId();
  if (!userId) {
    redirect("/login");
  }

  await ensureDefaultTaskTemplates(userId);
  const templates = await listTaskTemplates(userId);

  return <TaskTemplatesClient initialTemplates={templates} />;
}
