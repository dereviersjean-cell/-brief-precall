import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getContactsOverview } from "@/lib/db";
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as { supabaseUserId?: string } | null)?.supabaseUserId;

  const contacts = userId ? await getContactsOverview(userId) : [];

  return <ContactsClient contacts={contacts} />;
}
