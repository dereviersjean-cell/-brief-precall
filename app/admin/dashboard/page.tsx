import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import DashboardAdminClient from "./DashboardAdminClient";

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
  return <DashboardAdminClient />;
}
