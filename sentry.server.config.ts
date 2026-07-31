import * as Sentry from "@sentry/nextjs";

// Sentry — SERVEUR UNIQUEMENT, volontairement.
//
// Le besoin est ciblé : les webhooks (Recall, Stripe) et les crons Inngest
// échouent en silence. C'est le fil rouge des bugs #15, #19, #20 et #25 —
// tous découverts des jours après coup, parce que ces chemins n'ont pas
// d'utilisateur devant l'écran pour signaler la panne. Aucun besoin de
// monitoring navigateur pour ça, et pas de config client : le bundle envoyé
// aux utilisateurs reste strictement inchangé.
//
// Inerte sans DSN : en local et sur toute installation qui n'a pas configuré
// SENTRY_DSN, init() ne fait rien et captureException est un no-op. Aucune
// erreur, aucun bruit, aucune dépendance à un compte Sentry pour faire
// tourner le projet.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? "development",

  // Pas de traces de performance : on cherche des erreurs invisibles, pas des
  // millisecondes. Ça évite aussi de consommer le quota du plan gratuit avec
  // du bruit dont personne ne se servira.
  tracesSampleRate: 0,

  // Les transcripts de calls et les corps de webhooks contiennent des données
  // clients. On ne veut ni l'un ni l'autre dans Sentry.
  sendDefaultPii: false,

  beforeSend(event) {
    // Ceinture et bretelles : même si un jour quelqu'un attache un corps de
    // requête, on ne le laisse pas partir.
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
