import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import PromptsAdminClient from "./PromptsAdminClient";

export default async function AdminPromptsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
  return <PromptsAdminClient />;
}
