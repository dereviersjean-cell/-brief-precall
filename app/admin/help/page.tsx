import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllHelpArticles } from "@/lib/db";
import HelpAdminClient from "./HelpAdminClient";

export default async function HelpAdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const articles = await getAllHelpArticles();

  return <HelpAdminClient articles={articles} />;
}
