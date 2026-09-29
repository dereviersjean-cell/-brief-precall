import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getClientsOverview } from "@/lib/clients-overview";
import ClientsAdminClient from "./ClientsAdminClient";

export const dynamic = "force-dynamic";

export default async function ClientsAdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin");
  const now = new Date();
  const clients = await getClientsOverview(now);
  return <ClientsAdminClient clients={clients} now={now.toISOString()} />;
}
