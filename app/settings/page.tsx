import { redirect } from "next/navigation";

// /settings itself is now just a hub redirect — the actual content lives in
// the category sub-pages (general/connexions/crm/notifications), navigated
// via SettingsNav. Kept as a route (rather than removed) so existing links
// to bare /settings — e.g. TaskEmailModal's "Connecter Gmail dans les
// paramètres" — keep working.
export default function SettingsPage() {
  redirect("/settings/general");
}
