import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import TestAnalysisAdminClient from "./TestAnalysisAdminClient";

export default async function AdminTestAnalysisPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
  return <TestAnalysisAdminClient />;
}
