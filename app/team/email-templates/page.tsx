import { redirect } from "next/navigation";

// Les templates d'email ont rejoint les Paramètres le 04/09/2026. La route
// survit en redirection — des managers l'ont en favori, et elle a pu être
// citée dans des emails d'onboarding. Même traitement que /team/playbook lors
// de son passage dans Performance.
export default function MovedEmailTemplatesPage() {
  redirect("/settings/email-templates");
}
