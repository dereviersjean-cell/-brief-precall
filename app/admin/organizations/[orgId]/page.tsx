import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getOrganization, getUsersInOrganization, getUsersWithoutOrganization, getOrganizationBillingRow } from "@/lib/db";
import OrganizationDetailClient from "./OrganizationDetailClient";

export default async function OrganizationDetailAdminPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const { orgId } = await params;
  const organization = await getOrganization(orgId);
  if (!organization) {
    redirect("/admin/organizations");
  }

  const [members, availableUsers, billing] = await Promise.all([
    getUsersInOrganization(orgId),
    getUsersWithoutOrganization(),
    getOrganizationBillingRow(orgId),
  ]);

  return (
    <OrganizationDetailClient
      organization={organization}
      initialMembers={members}
      availableUsers={availableUsers}
      billing={billing}
    />
  );
}
