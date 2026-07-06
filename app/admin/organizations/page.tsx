import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listOrganizationsWithCounts } from "@/lib/db";
import OrganizationsAdminClient from "./OrganizationsAdminClient";

export default async function OrganizationsAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const organizations = await listOrganizationsWithCounts();

  return <OrganizationsAdminClient organizations={organizations} />;
}
