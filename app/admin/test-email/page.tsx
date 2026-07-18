import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import TestEmailAdminClient from "./TestEmailAdminClient";

export default async function AdminTestEmailPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
  return <TestEmailAdminClient />;
}
