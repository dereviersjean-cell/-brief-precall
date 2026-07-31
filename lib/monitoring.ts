// Remontée des échecs SILENCIEUX vers Sentry.
//
// Le problème que ça résout : Brief est truffé d'étapes volontairement non
// bloquantes — l'analyse d'un call ne doit pas échouer parce que la synchro
// HubSpot est tombée, la facturation ne doit pas s'arrêter parce qu'un email
// n'est pas parti. Ces `catch` font donc un `console.error` et continuent.
// C'est le bon comportement fonctionnel, mais ça veut dire que personne
// n'apprend jamais qu'ils se produisent : webhooks et crons n'ont pas
// d'utilisateur devant l'écran. Bugs #15, #19, #20 et #25 : tous découverts
// des jours après coup, tous sur ce schéma.
//
// `reportError` garde le `console.error` (les logs Vercel restent la source de
// débogage immédiate) et ajoute la remontée Sentry.
//
// Import dynamique du SDK, comme lib/admin-config.ts : ce module est appelé
// depuis des fichiers de `lib/` potentiellement atteints par un import
// transitif côté client, et on ne veut pas y embarquer Sentry (cf. bug #12).

type Context = Record<string, unknown>;

// Ne throw JAMAIS : appelé exclusivement depuis des blocs catch. Une erreur
// levée ici transformerait un échec bénin en panne — exactement le contraire
// du but.
async function send(level: "error" | "warning", scope: string, error: unknown, context?: Context): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((sentryScope) => {
      sentryScope.setLevel(level);
      // Regroupe les occurrences par chemin de code plutôt que par message :
      // « bot-webhook.indexCallObjections » reste une seule alerte même si le
      // message d'erreur varie d'une fois sur l'autre.
      sentryScope.setTag("scope", scope);
      if (context) sentryScope.setContext("details", context);
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
    });
  } catch {
    // Sentry indisponible ou mal configuré : on ne fait rien de plus. Le
    // console.error de l'appelant a déjà eu lieu.
  }
}

/**
 * Trace un échec non bloquant : log console (inchangé) + remontée Sentry.
 *
 * @param scope chemin de code stable, forme « module.étape » — sert de clé de
 *              regroupement dans Sentry, à garder identique entre appels.
 */
export function reportError(scope: string, error: unknown, context?: Context): void {
  console.error(`[${scope}]`, error instanceof Error ? error.message : String(error), context ?? "");
  // Volontairement non attendu ET non rattaché à la réponse : cette fonction
  // est appelée dans des catch dont l'appelant ne peut pas devenir async sans
  // changer sa sémantique. `send` avale déjà toutes ses erreurs, il ne peut
  // donc pas produire de rejet non géré.
  void send("error", scope, error, context);
}

/** Idem, pour ce qui mérite d'être vu sans être une panne. */
export function reportWarning(scope: string, error: unknown, context?: Context): void {
  console.warn(`[${scope}]`, error instanceof Error ? error.message : String(error), context ?? "");
  void send("warning", scope, error, context);
}
