import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import TestBriefAdminClient from "./TestBriefAdminClient";

export default async function AdminTestBriefPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
  return <TestBriefAdminClient />;
}
