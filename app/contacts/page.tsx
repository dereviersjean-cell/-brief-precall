import { getContactsOverview } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/session-user";
import ContactsClient from "./ContactsClient";

export default async function ContactsPage() {
  const userId = await getEffectiveUserId();

  const contacts = userId ? await getContactsOverview(userId) : [];

  return <ContactsClient contacts={contacts} />;
}
