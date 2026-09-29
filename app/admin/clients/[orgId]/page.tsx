import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getClientDetail } from "@/lib/clients-overview";
import { getUsersWithoutOrganization, getOrganizationBillingRow } from "@/lib/db";
import ClientDetailClient from "./ClientDetailClient";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin");

  const { orgId } = await params;
  const [detail, availableUsers, billing] = await Promise.all([
    getClientDetail(orgId),
    getUsersWithoutOrganization(),
    getOrganizationBillingRow(orgId),
  ]);
  if (!detail) redirect("/admin/clients");

  return <ClientDetailClient detail={detail} availableUsers={availableUsers} billing={billing} />;
}
