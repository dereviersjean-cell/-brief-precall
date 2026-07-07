import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getUserDetailForAdmin, getImpersonationLogsForUser } from "@/lib/db";
import UserDetailAdminClient from "./UserDetailAdminClient";

export default async function UserDetailAdminPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const { userId } = await params;
  const user = await getUserDetailForAdmin(userId);
  if (!user) {
    redirect("/admin/dashboard");
  }

  const impersonationLogs = await getImpersonationLogsForUser(userId);

  return <UserDetailAdminClient user={user} impersonationLogs={impersonationLogs} />;
}
