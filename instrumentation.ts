// Point d'entrée d'instrumentation Next.js. Chargé une fois au démarrage du
// runtime serveur, avant tout traitement de requête.
//
// L'import est dynamique et conditionné au runtime : la config Sentry ne doit
// pas être embarquée dans le runtime edge (le middleware), qui a un budget de
// taille serré et n'a rien à instrumenter ici.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

// Remonte automatiquement les erreurs non rattrapées des server components et
// des route handlers. Complète — sans remplacer — les remontées explicites de
// lib/monitoring.ts : celles-ci concernent les échecs volontairement NON
// bloquants, qui par définition ne remontent jamais jusqu'ici.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
