import type { Metadata } from "next";
import { SiteChrome } from "@/app/components/landing/SiteChrome";

// Page d'arrivée de l'administrateur informatique du client, après l'écran de
// consentement Microsoft (app/api/microsoft/admin-consent/callback).
//
// PUBLIQUE, et donc volontairement ABSENTE du matcher de middleware.ts —
// l'exception à la règle « toute nouvelle page top-level rejoint le matcher »,
// qui vise les pages de l'app. Cette personne n'a pas de compte Brief : la
// garder derrière l'authentification la renverrait sur /login, qu'elle ne
// saurait pas passer. Elle ne contient rien de l'organisation, pas même son
// nom : seul l'état de l'opération.
//
// Hors du sitemap et en noindex : ce n'est pas une page du site, c'est la fin
// d'un parcours privé.

export const metadata: Metadata = {
  title: "Autorisation Microsoft · Brief",
  robots: { index: false, follow: false },
};

type Etat = "ok" | "refus" | "lien-invalide" | "accorde-non-enregistre";

const MESSAGES: Record<Etat, { title: string; lead: string; detail: string | null; tone: "ok" | "warn" }> = {
  ok: {
    title: "C'est autorisé. Merci.",
    lead: "Les salariés de votre organisation peuvent désormais se connecter à Brief avec leur compte Microsoft et y brancher leur agenda Outlook.",
    detail:
      "Pour retirer cet accord : Microsoft Entra ID › Applications d'entreprise › Brief. Vous pouvez fermer cette page.",
    tone: "ok",
  },
  refus: {
    title: "L'accord n'a pas été donné",
    lead: "L'écran Microsoft s'est refermé sans accorder l'accès. C'est le cas, notamment, si le compte utilisé n'est pas administrateur du tenant.",
    detail:
      "Reprenez le lien avec un compte administrateur, ou demandez-en un nouveau à la personne qui vous l'a transmis.",
    tone: "warn",
  },
  "lien-invalide": {
    title: "Ce lien n'est plus valide",
    lead: "Un lien d'autorisation vaut trente jours. Passé ce délai, ou s'il a été tronqué en route, il faut en demander un nouveau.",
    detail: "La personne qui vous l'a envoyé peut en générer un autre depuis Brief, dans Paramètres › Connexions.",
    tone: "warn",
  },
  "accorde-non-enregistre": {
    title: "C'est autorisé chez Microsoft",
    lead: "L'accès est bien accordé : vos salariés peuvent se connecter. En revanche, Brief n'a pas réussi à enregistrer l'information de son côté.",
    detail:
      "Rien à refaire pour vous. Prévenez simplement la personne qui vous a envoyé le lien : son écran continuera d'afficher « en attente ».",
    tone: "warn",
  },
};

function isEtat(value: string | undefined): value is Etat {
  return value === "ok" || value === "refus" || value === "lien-invalide" || value === "accorde-non-enregistre";
}

export default async function MicrosoftAutorisePage({
  searchParams,
}: {
  searchParams: Promise<{ etat?: string }>;
}) {
  const { etat } = await searchParams;
  // Un paramètre inconnu (ou absent) n'invente pas une réussite.
  const message = MESSAGES[isEtat(etat) ? etat : "lien-invalide"];

  return (
    <SiteChrome>
      <section className="mx-auto max-w-[760px] px-5 py-16 sm:px-6 sm:py-24">
        <div className="rounded-[24px] border border-land-line bg-white p-7 sm:p-10">
          <span
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
              message.tone === "ok" ? "bg-land-accent-soft text-land-accent" : "bg-land-sunken text-land-ink"
            }`}
            aria-hidden="true"
          >
            {message.tone === "ok" ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            )}
          </span>
          <h1 className="mt-5 text-[30px] leading-[1.15] font-semibold tracking-[-0.02em] text-land-ink sm:text-[36px]">
            {message.title}
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-land-muted">{message.lead}</p>
          {message.detail && <p className="mt-3 text-[15px] leading-relaxed text-land-muted">{message.detail}</p>}

          <div className="mt-8 border-t border-land-line pt-6">
            <h2 className="text-[14px] font-semibold text-land-ink">Ce que Brief lit, et ce qu&apos;il ne lit pas</h2>
            <ul className="mt-3 space-y-2 text-[14.5px] leading-relaxed text-land-muted">
              <li>
                <strong className="font-semibold text-land-ink">Calendars.Read</strong> — l&apos;agenda des salariés qui
                se connectent eux-mêmes à Brief, pour préparer et analyser leurs rendez-vous.
              </li>
              <li>
                <strong className="font-semibold text-land-ink">Mail.Send</strong> — l&apos;envoi d&apos;un email en leur
                nom, après qu&apos;ils l&apos;ont relu.
              </li>
              <li>
                <strong className="font-semibold text-land-ink">Aucune lecture de la messagerie</strong> — ni contenu, ni
                en-têtes. Aucune écriture dans l&apos;agenda, aucun accès aux fichiers.
              </li>
            </ul>
            <p className="mt-4 text-[14px] text-land-muted">
              Le détail est sur la page{" "}
              <a href="/securite" className="font-medium text-land-accent underline">
                Sécurité et données
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
