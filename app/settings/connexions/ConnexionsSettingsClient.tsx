"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { AlertTriangle, CalendarCheck, Video, Share2 } from "lucide-react";
import HowItWorksCard, { type PipelineStep } from "@/app/settings/_components/HowItWorksCard";

const PIPELINE_STEPS: PipelineStep[] = [
  {
    icon: CalendarCheck,
    title: "Votre agenda est relu",
    description: "Toutes les 5 minutes, Brief repère vos rendez-vous à venir avec un participant externe.",
  },
  {
    icon: Video,
    title: "Un bot rejoint la visio",
    description: "Il enregistre l'échange, le transcrit, et l'analyse repart dans votre compte-rendu.",
  },
];

// Troisième étape selon les modules ouverts (parcours client) : un client à
// qui l'on n'a pas encore présenté le CRM ou Slack ne doit pas en lire le nom
// ici — ce texte trahissait des modules fermés (29/09/2026).
function deliveryStep(crmEnabled: boolean, slackEnabled: boolean): (typeof PIPELINE_STEPS)[number] {
  if (crmEnabled && slackEnabled) {
    return { icon: Share2, title: "Restitué dans vos outils", description: "Notes poussées dans HubSpot ou Pipedrive, alertes dans Slack — sans repasser par Brief." };
  }
  if (crmEnabled) {
    return { icon: Share2, title: "Restitué dans votre CRM", description: "Notes poussées dans HubSpot ou Pipedrive — sans repasser par Brief." };
  }
  if (slackEnabled) {
    return { icon: Share2, title: "Restitué dans Slack", description: "Briefs et comptes-rendus en message privé — sans repasser par Brief." };
  }
  return { icon: Share2, title: "Le compte-rendu vous attend", description: "Analyse, points clés et scores, quelques minutes après la fin du rendez-vous." };
}

export default function ConnexionsSettingsClient({
  recallConnected,
  recallDisconnected,
  recallDisconnectedSince,
  recallPlatform,
  hasCalendarWriteAccess,
  slackConnected: initialSlackConnected,
  slackEnabled,
  crmEnabled,
}: {
  recallConnected: boolean;
  // Agenda enregistré mais coupé chez Recall (jeton expiré ou révoqué).
  recallDisconnected: boolean;
  recallDisconnectedSince: string | null;
  recallPlatform: string | null;
  hasCalendarWriteAccess: boolean;
  slackConnected: boolean;
  // Modules ouverts pour l'organisation (parcours client) — sinon, ni carte
  // ni mention dans les textes.
  slackEnabled: boolean;
  crmEnabled: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [disconnecting, setDisconnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const [slackConnected, setSlackConnected] = useState(initialSlackConnected);
  const [slackDisconnecting, setSlackDisconnecting] = useState(false);

  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const recall = searchParams.get("recall");
    if (recall === "connected") {
      setToast({ type: "success", message: "Calendrier connecté avec succès." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
    if (recall === "error") {
      setToast({ type: "error", message: "La connexion au calendrier a échoué, réessayez." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
    const slack = searchParams.get("slack");
    if (slack === "connected") {
      setSlackConnected(true);
      setToast({ type: "success", message: "Slack connecté avec succès." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
    if (slack === "error") {
      setToast({ type: "error", message: "La connexion à Slack a échoué, réessayez." });
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  const mailProvider = session?.provider === "google" ? "Google" : session?.provider === "azure-ad" ? "Microsoft" : null;

  return (
    <div>
      {toast && (
        <div className={`mb-6 flex items-center justify-between gap-4 rounded-xl px-4 py-3 ${
          toast.type === "success" ? "bg-[color:var(--success-soft)]" : "bg-[color:var(--danger-soft)]"
        }`}>
          <p className={`text-[13px] font-medium ${toast.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
            {toast.message}
          </p>
          <button
            onClick={() => setToast(null)}
            className={`shrink-0 text-lg leading-none ${toast.type === "success" ? "text-emerald-700/60 hover:text-emerald-700" : "text-rose-700/60 hover:text-rose-700"}`}
          >
            ×
          </button>
        </div>
      )}

      <HowItWorksCard title="Connexions" steps={[...PIPELINE_STEPS, deliveryStep(crmEnabled, slackEnabled)]}>
        C&apos;est ici que Brief cesse d&apos;être une application à ouvrir pour devenir automatique. Une fois votre
        agenda connecté, vous n&apos;avez plus rien à déclencher :{" "}
        <span className="font-medium text-slate-900">le brief est prêt avant le rendez-vous</span> et le compte-rendu
        arrive après, sans action de votre part.{" "}
        {crmEnabled && (
          <>
            Le CRM décide ensuite d&apos;<span className="font-medium text-slate-900">où</span> ce travail vous est
            livré — dans HubSpot ou Pipedrive, là où vous suivez déjà vos deals.{" "}
          </>
        )}
        Sans agenda connecté, tout reste possible mais devient manuel : chaque brief
        est à demander, et aucun appel n&apos;est enregistré ni analysé.
      </HowItWorksCard>

      <div className="rounded-2xl border border-border bg-white">
        <div className="px-5 py-5 sm:px-6">
          <h2 className="mb-1 text-[14px] font-semibold text-slate-900">Calendrier Recall</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-slate-500">
            Permet l&apos;enregistrement et l&apos;analyse automatique de vos appels avec des prospects.
          </p>
          {recallConnected && recallDisconnected ? (
            // Reconnecter crée un nouvel agenda chez Recall ; l'ancien, coupé,
            // est supprimé au retour (saveReconnectedCalendar).
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[color:var(--danger-soft)] px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-rose-700">Agenda déconnecté</p>
                <p className="mt-0.5 text-[13px] text-rose-700">
                  L&apos;accès à votre agenda a expiré
                  {recallDisconnectedSince
                    ? ` le ${new Date(recallDisconnectedSince).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`
                    : ""}
                  . Vos rendez-vous ne sont plus enregistrés ni analysés.
                </p>
              </div>
              <a
                href={recallPlatform === "microsoft_outlook" ? "/api/recall/microsoft-oauth/start" : "/api/recall/google-oauth/start"}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[color:var(--primary)] px-3.5 text-[13px] font-medium text-white transition-all hover:brightness-110"
              >
                Reconnecter mon agenda
              </a>
            </div>
          ) : recallConnected ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[color:var(--success-soft)] px-2.5 py-1">
                <svg className="h-3.5 w-3.5 shrink-0 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="min-w-0 truncate text-[12px] font-semibold text-emerald-700">Calendrier connecté</span>
              </div>
              <button
                disabled={disconnecting}
                onClick={async () => {
                  if (!window.confirm("Déconnecter le calendrier ? L'enregistrement automatique de vos calls sera désactivé.")) return;
                  setDisconnecting(true);
                  try {
                    await fetch("/api/recall/disconnect", { method: "POST" });
                    router.refresh();
                  } finally {
                    setDisconnecting(false);
                  }
                }}
                className="text-[13px] text-slate-500 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {disconnecting ? "Déconnexion…" : "Déconnecter"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href="/api/recall/google-oauth/start"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white transition-all hover:brightness-110"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" opacity=".9"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".9"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#fff" opacity=".9"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
                </svg>
                Connecter Google
              </a>
              <a
                href="/api/recall/microsoft-oauth/start"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-slate-800"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 0H0v11.4h11.4V0z" fill="#fff" opacity=".9"/>
                  <path d="M24 0H12.6v11.4H24V0z" fill="#fff" opacity=".9"/>
                  <path d="M11.4 12.6H0V24h11.4V12.6z" fill="#fff" opacity=".9"/>
                  <path d="M24 12.6H12.6V24H24V12.6z" fill="#fff" opacity=".9"/>
                </svg>
                Connecter Outlook
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Distinct from "Calendrier Recall" above — this is about the app's
          own Google session (login), not Recall's separate calendar
          connection. Reconnecting here re-runs NextAuth's Google OAuth flow
          so the user grants the newer calendar.events scope (module
          Distribution Flexible sous-étape B) — /api/recall/google-oauth/start
          above wouldn't touch this at all, it's a different credential. */}
      {!hasCalendarWriteAccess && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-[color:var(--warning-soft)] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-relaxed text-amber-800">
              Reconnectez-vous à Google Calendar pour bénéficier des nouvelles fonctionnalités (écriture de briefs
              dans les événements).
            </p>
            <button
              disabled={reconnecting}
              onClick={async () => {
                setReconnecting(true);
                // 3e argument = authorizationParams. prompt=consent est ce
                // qui rend ce bouton réparateur : sans lui Google renvoie un
                // access_token sans refresh_token, saveGoogleTokens garde
                // l'ancien jeton (mort ou scopé calendar.readonly), et le
                // bandeau réapparaît indéfiniment sans que rien ne change.
                // Il est ici et pas dans le GoogleProvider (lib/auth.ts) pour
                // que la connexion quotidienne reste directe.
                await signIn(
                  "google",
                  { callbackUrl: "/settings/connexions" },
                  { prompt: "consent" }
                );
              }}
              className="mt-2 inline-flex h-8 items-center rounded-lg bg-white px-3 text-[12px] font-semibold text-amber-800 transition-colors hover:bg-white/70 disabled:opacity-50"
            >
              {reconnecting ? "Redirection…" : "Se reconnecter avec Google"}
            </button>
          </div>
        </div>
      )}

      {/* Compte Mail — read-only: this is the same account used to log into
          Brief (lib/auth.ts), not a separate integration, so there's no
          connect/disconnect action here (that's the sidebar's "Déconnexion").
          Google sends through Gmail (gmail.send), Microsoft through Outlook
          (Mail.Send, since 28/09/2026) — send-only on both sides. */}
      <div className="rounded-2xl border border-border bg-white mt-6">
        <div className="px-5 py-5 sm:px-6">
          <h2 className="mb-1 text-[14px] font-semibold text-slate-900">Compte Mail</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-slate-500">
            Le compte utilisé pour vous connecter à Brief — envoi des emails de suivi en votre nom. Brief ne lit pas votre messagerie.
          </p>
          {mailProvider ? (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[color:var(--success-soft)] px-2.5 py-1">
                <svg className="h-3.5 w-3.5 shrink-0 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="min-w-0 truncate text-[12px] font-semibold text-emerald-700">
                  {mailProvider} — {session?.user?.email}
                </span>
              </div>
              <span className="text-[12px] text-slate-500">
                Envoi via {session?.provider === "azure-ad" ? "Outlook" : "Gmail"}
              </span>
            </div>
          ) : (
            <p className="text-[13px] text-slate-400">Chargement…</p>
          )}
        </div>
      </div>

      {/* Compte Slack — same connect/disconnect pattern as Pipedrive/HubSpot
          in the CRM section just below (CrmSection.tsx). Status fetched
          server-side (page.tsx, via hasSlackConnection) so there's no
          loading flash. */}
      {slackEnabled && (
      <div className="rounded-2xl border border-border bg-white mt-6">
        <div className="px-5 py-5 sm:px-6">
          <h2 className="mb-1 text-[14px] font-semibold text-slate-900">Compte Slack</h2>
          <p className="mb-4 text-[13px] leading-relaxed text-slate-500">
            Permet l&apos;envoi de vos briefs, analyses et digests en message privé sur Slack.
          </p>
          {slackConnected ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[color:var(--success-soft)] px-2.5 py-1">
                <svg className="h-3.5 w-3.5 shrink-0 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="min-w-0 truncate text-[12px] font-semibold text-emerald-700">Slack connecté</span>
              </div>
              <button
                disabled={slackDisconnecting}
                onClick={async () => {
                  if (!window.confirm("Déconnecter Slack ? Le canal Slack sera désactivé dans vos notifications.")) return;
                  setSlackDisconnecting(true);
                  try {
                    await fetch("/api/slack/disconnect", { method: "POST" });
                    setSlackConnected(false);
                  } finally {
                    setSlackDisconnecting(false);
                  }
                }}
                className="text-[13px] text-slate-500 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {slackDisconnecting ? "Déconnexion…" : "Déconnecter"}
              </button>
            </div>
          ) : (
            <a
              href="/api/slack/start"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#4A154B] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#3d1140]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.845 14.522a2.528 2.528 0 0 1-2.521 2.521A2.528 2.528 0 0 1 3.803 14.522a2.528 2.528 0 0 1 2.521-2.521h2.521v2.521ZM10.108 14.522a2.528 2.528 0 0 1 2.521-2.521 2.528 2.528 0 0 1 2.521 2.521v6.31A2.528 2.528 0 0 1 12.629 23.35a2.528 2.528 0 0 1-2.521-2.521v-6.307ZM12.629 8.845a2.528 2.528 0 0 1-2.521-2.521A2.528 2.528 0 0 1 12.629 3.8a2.528 2.528 0 0 1 2.521 2.521v2.521h-2.521ZM12.629 10.108a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521h-6.31a2.528 2.528 0 0 1-2.52-2.521 2.528 2.528 0 0 1 2.52-2.521h6.307ZM18.306 12.629a2.528 2.528 0 0 1 2.521-2.521 2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521h-2.521v-2.521ZM17.043 12.629a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521v-6.31a2.528 2.528 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.31Z" fillOpacity=".9"/>
              </svg>
              Connecter Slack
            </a>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
