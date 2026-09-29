import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getClientReview } from "@/lib/client-review";
import { isUuid } from "@/lib/uuid";
import ClientReviewClient from "./ClientReviewClient";

export const dynamic = "force-dynamic";

// Rapport de préparation du point hebdomadaire : à lire dix minutes avant le
// call avec le client (lib/client-review.ts).
export default async function ClientReviewPage({ params }: { params: Promise<{ orgId: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin");

  const { orgId } = await params;
  if (!isUuid(orgId)) redirect("/admin/clients");
  const review = await getClientReview(orgId);
  if (!review) redirect("/admin/clients");

  return <ClientReviewClient review={review} />;
}
