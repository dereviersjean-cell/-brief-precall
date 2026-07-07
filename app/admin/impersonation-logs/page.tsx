import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listImpersonationLogs } from "@/lib/db";
import ImpersonationLogsAdminClient from "./ImpersonationLogsAdminClient";

export default async function ImpersonationLogsAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const logs = await listImpersonationLogs(20);

  return <ImpersonationLogsAdminClient logs={logs} />;
}
