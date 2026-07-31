import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { reportError } from "@/lib/monitoring";

// Vérification du monitoring, à la demande.
//
// Un monitoring qu'on croit actif alors qu'il ne l'est pas est PIRE que pas de
// monitoring : on cesse de surveiller en croyant être couvert. Cette route
// permet de le prouver — au premier branchement, et à chaque fois que le DSN
// change ou qu'on soupçonne un silence anormal.
//
// GET  : la variable d'environnement est-elle présente sur ce déploiement ?
// POST : envoie une vraie erreur de test, qui doit apparaître dans Sentry.

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dsn = process.env.SENTRY_DSN;
  return NextResponse.json({
    configured: !!dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    // Jamais le DSN complet dans une réponse HTTP — il porte une clé publique
    // d'ingestion qu'il n'y a aucune raison d'exposer plus que nécessaire.
    hint: dsn ? `${dsn.slice(0, 12)}…${dsn.slice(-6)}` : null,
  });
}

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.SENTRY_DSN) {
    return NextResponse.json(
      { sent: false, error: "SENTRY_DSN absente sur ce déploiement — rien ne peut remonter." },
      { status: 400 }
    );
  }

  const marker = `test-${Date.now()}`;
  reportError("admin.monitoringTest", new Error(`Test de monitoring déclenché depuis l'admin (${marker})`), {
    marker,
    triggeredAt: new Date().toISOString(),
  });

  // reportError est volontairement synchrone et n'attend pas l'envoi (il est
  // fait pour être appelé dans des blocs catch). On laisse donc au transport
  // le temps de partir avant que la fonction serverless ne gèle.
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return NextResponse.json({
    sent: true,
    marker,
    message: "Erreur de test envoyée. Elle doit apparaître dans Sentry sous le tag scope=admin.monitoringTest.",
  });
}
