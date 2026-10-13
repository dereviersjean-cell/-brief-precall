import type { Metadata } from "next";
import { Mail, EyeOff, Ban, Server, ArrowUpRight } from "lucide-react";
import { SiteChrome } from "@/app/components/landing/SiteChrome";
import { PageHero } from "@/app/components/landing/sections";
import { NB } from "@/app/components/landing/team-data";
import { LEGAL_LINK, LegalBullets, LegalSection, LegalTable, LegalToc } from "@/app/components/landing/legal";

// Politique de confidentialité, refaite le 13/10/2026 dans l'habillage du site
// public (elle vivait dans le layout minimal de `app/(legal)`, supprimé depuis).
//
// Page lue par la vérification OAuth de Google : l'URL /confidentialite, la
// mention de la Google API Services User Data Policy (Limited Use), la liste
// des données Google utilisées et le lien de révocation doivent rester. Chaque
// affirmation est alignée sur le code et sur la page /securite ; en changer
// une, c'est changer les deux.

export const metadata: Metadata = {
  title: "Politique de confidentialité · Brief",
  description: "Comment Brief collecte, utilise et protège vos données, y compris les données de votre compte Google.",
};

const UPDATED = "13 octobre 2026";


const ESSENTIALS = [
  { icon: Mail, title: "Aucune lecture de vos emails", body: "Brief peut envoyer un email en votre nom, jamais lire votre messagerie." },
  { icon: EyeOff, title: "La vidéo n'est pas conservée", body: "Brief garde la transcription et l'analyse d'un call, pas la vidéo." },
  { icon: Ban, title: "Ni revente, ni publicité", body: "Vos données ne servent pas à la publicité ni à entraîner des modèles d'IA génériques." },
  { icon: Server, title: "Hébergé en Europe", body: "Base de données et application à Paris, visios traitées à Francfort." },
];

const SECTIONS = [
  { id: "qui", title: "Qui sommes-nous" },
  { id: "donnees", title: "Les données que nous collectons" },
  { id: "usages", title: "Pourquoi nous les utilisons" },
  { id: "hebergement", title: "Hébergement et localisation" },
  { id: "conservation", title: "Durées de conservation" },
  { id: "droits", title: "Vos droits" },
  { id: "securite", title: "Sécurité" },
  { id: "cookies", title: "Cookies" },
  { id: "modifications", title: "Modifications" },
];

const RETENTION: [string, string][] = [
  ["Transcriptions, analyses de rendez-vous et briefs", "24 mois à compter de leur création, puis suppression."],
  ["Comptes, contacts et références clients", "Tant que votre compte est actif."],
  ["Après résiliation ou suppression de votre compte", "Suppression sous 30 jours."],
  ["Données de facturation", "Le temps imposé par la loi (10 ans pour les pièces comptables)."],
];

const B = ({ children }: { children: React.ReactNode }) => <b className="font-semibold text-land-ink">{children}</b>;

export default function PrivacyPolicyPage() {
  return (
    <SiteChrome>
      <PageHero
        label="Confidentialité"
        title="Politique de confidentialité."
        lead={`Ce que Brief collecte, pourquoi, avec qui, combien de temps, et comment exercer vos droits. Dernière mise à jour${NB}: ${UPDATED}.`}
      />

      <section className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:pt-20">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-land-faint">L&apos;essentiel</h2>
        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ESSENTIALS.map((e) => (
            <li key={e.title} className="rounded-[20px] border border-land-line bg-land-surface p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-land-accent-soft text-land-accent">
                <e.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="mt-4 text-[16px] font-semibold tracking-tight text-land-ink">{e.title}</div>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-land-muted">{e.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:py-24">
        <LegalToc sections={SECTIONS} />

        <article className="max-w-[72ch] space-y-10">
          <LegalSection id="qui" title="Qui sommes-nous">
            <p>
              Brief (« nous ») est un logiciel de préparation et d&apos;analyse de rendez-vous commerciaux B2B, édité
              par une société basée en France, destiné aux équipes commerciales.
            </p>
            <p>
              Pour toute question relative à cette politique ou à vos données, écrivez-nous à{" "}
              <a href="mailto:contact@brief-ai.fr" className={LEGAL_LINK}>contact@brief-ai.fr</a>.
            </p>
          </LegalSection>

          <LegalSection id="donnees" title="Les données que nous collectons">
            <p>
              Lorsque vous connectez votre compte Google (ou Microsoft) à Brief, nous accédons, avec votre consentement
              explicite au moment de la connexion, aux données suivantes :
            </p>
            <LegalBullets
              items={[
                <><B>Identité</B> : nom, adresse email et photo de profil de votre compte Google ou Microsoft.</>,
                <><B>Agenda</B> : les événements de votre calendrier (horaires, participants, titre du rendez-vous), et la possibilité d&apos;écrire dans la description d&apos;un événement pour y déposer votre brief pré-rendez-vous.</>,
                <><B>Emails</B> : l&apos;envoi d&apos;emails à votre initiative (relance, devis) depuis votre propre boîte Gmail ou Outlook, en votre nom, après que vous en avez relu le contenu. <B>Brief n&apos;a aucun accès en lecture à votre messagerie</B> : ni le contenu de vos messages, ni leurs en-têtes.</>,
              ]}
            />
            <p>
              Nous ne demandons jamais un accès plus large que nécessaire : le seul droit Gmail demandé par Brief est{" "}
              <code className="rounded-md bg-land-sunken px-1.5 py-0.5 text-[14px] text-land-ink">gmail.send</code>, qui
              permet d&apos;envoyer un message en votre nom et rien d&apos;autre. Aucun droit de lecture n&apos;est
              demandé, pas même celui limité aux en-têtes. Il en va de même pour un compte Microsoft : le seul droit de
              messagerie demandé est{" "}
              <code className="rounded-md bg-land-sunken px-1.5 py-0.5 text-[14px] text-land-ink">Mail.Send</code>, limité
              lui aussi à l&apos;envoi.
            </p>
            <p>Selon les intégrations que vous ou votre organisation activez, nous pouvons aussi traiter :</p>
            <LegalBullets
              items={[
                <>L&apos;enregistrement, la transcription et l&apos;analyse de vos visios (Google Meet, Teams, Zoom), lorsqu&apos;un bot Brief y est invité.</>,
                <>Les données de vos contacts et opportunités issues d&apos;un CRM connecté (HubSpot, Pipedrive).</>,
                <>Le contenu d&apos;un playbook commercial importé depuis Notion, Word ou PDF.</>,
                <>Des informations publiques sur les entreprises de vos prospects (registre légal français, actualités).</>,
              ]}
            />
          </LegalSection>

          <LegalSection id="usages" title="Pourquoi nous les utilisons">
            <p>Ces données servent exclusivement à faire fonctionner Brief pour vous :</p>
            <LegalBullets
              items={[
                <>Générer un dossier de préparation avant chaque rendez-vous.</>,
                <>Transcrire et analyser vos appels selon le playbook de votre équipe.</>,
                <>Rédiger des brouillons d&apos;email de suivi, que vous relisez avant envoi.</>,
                <>Vous permettre de vous entraîner sur les objections que vous avez rencontrées.</>,
                <>Donner à votre manager une vue agrégée de la performance de l&apos;équipe.</>,
              ]}
            />
            <div className="rounded-[20px] bg-land-accent-soft p-5 text-land-ink sm:p-6">
              Notre utilisation et notre transfert des informations reçues des API Google respectent la{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className={LEGAL_LINK}>
                Google API Services User Data Policy
              </a>
              , y compris ses exigences d&apos;utilisation limitée (Limited Use). En particulier, les données issues de
              votre compte Google ne sont jamais utilisées à des fins publicitaires, ne sont jamais revendues, et ne
              servent jamais à entraîner des modèles d&apos;intelligence artificielle génériques : elles servent
              uniquement à générer, pour vous, les briefs, analyses et brouillons décrits ci-dessus.
            </div>
            {/* La liste nominative des prestataires a été retirée (Jean,
                13/10/2026). On garde les catégories de sous-traitants : le RGPD
                (art. 13) et la vérification OAuth de Google demandent de dire
                avec qui les données sont partagées. */}
            <p>
              Nous ne vendons aucune donnée. Certains traitements sont confiés à des sous-traitants techniques
              (hébergement, transcription des visios, intelligence artificielle, envoi d&apos;emails), uniquement pour
              faire fonctionner Brief. Nous pouvons aussi communiquer des données si la loi nous y oblige.
            </p>
          </LegalSection>

          <LegalSection id="hebergement" title="Hébergement et localisation">
            <p>
              La base de données et l&apos;application sont hébergées à Paris. Les enregistrements et transcriptions de
              vos visios sont traités en Europe, à Francfort (région eu-central-1 de Recall.ai). Les briefs et analyses
              sont générés par les modèles d&apos;Anthropic, qui ne sont pas hébergés en Europe.
            </p>
            <p>
              Nous privilégions des prestataires et des hébergements européens ou conformes au RGPD pour l&apos;ensemble
              de nos traitements.
            </p>
          </LegalSection>

          <LegalSection id="conservation" title="Durées de conservation">
            <p>
              Nous conservons vos données le temps nécessaire à la fourniture du service, tant que votre compte est
              actif au sein de votre organisation. Les enregistrements vidéo de vos visios ne sont jamais stockés
              durablement par Brief : nous conservons la transcription et l&apos;analyse qui en sont issues, pas la vidéo
              elle-même.
            </p>
            <LegalTable rows={RETENTION} />
            <p>
              En cas de résiliation de l&apos;abonnement de votre organisation ou de suppression de votre compte, vos
              données sont supprimées ou anonymisées, sauf obligation légale de conservation plus longue (par exemple
              pour la facturation).
            </p>
          </LegalSection>

          <LegalSection id="droits" title="Vos droits">
            <p>
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
              portabilité et d&apos;opposition sur vos données personnelles. Pour l&apos;exercer, écrivez-nous à{" "}
              <a href="mailto:contact@brief-ai.fr" className={LEGAL_LINK}>contact@brief-ai.fr</a>. Vous pouvez également
              introduire une réclamation auprès de la CNIL (cnil.fr).
            </p>
            <p>
              Vous pouvez à tout moment révoquer l&apos;accès de Brief à votre compte Google depuis la page{" "}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className={LEGAL_LINK}>
                myaccount.google.com/permissions
              </a>
              . La révocation prend effet immédiatement ; certaines fonctionnalités de Brief (agenda, email) cessent
              alors de fonctionner jusqu&apos;à une nouvelle connexion.
            </p>
          </LegalSection>

          <LegalSection id="securite" title="Sécurité">
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos données
              (chiffrement en transit, accès restreint à la base de données, isolation des données entre
              organisations). Aucun système n&apos;étant infaillible, nous ne pouvons garantir une sécurité absolue.
            </p>
          </LegalSection>

          <LegalSection id="cookies" title="Cookies">
            <p>
              Brief utilise uniquement des cookies strictement nécessaires au fonctionnement du service, notamment un
              cookie de session pour vous garder connecté. Nous n&apos;utilisons pas de cookies publicitaires ni de
              traceurs tiers à des fins de suivi marketing.
            </p>
          </LegalSection>

          <LegalSection id="modifications" title="Modifications de cette politique">
            <p>
              Nous pouvons mettre à jour cette politique, par exemple lors de l&apos;ajout d&apos;une nouvelle
              fonctionnalité ou intégration. La date de mise à jour en haut de cette page indique la dernière révision.
            </p>
          </LegalSection>

          <div className="flex flex-col items-start gap-4 rounded-[24px] bg-land-surface p-6 ring-1 ring-land-line sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <div className="text-[18px] font-semibold tracking-tight text-land-ink">Une question sur vos données{NB}?</div>
              <p className="mt-1 text-[15px] text-land-muted">Écrivez-nous, y compris pour une demande d&apos;accès ou de suppression.</p>
            </div>
            <a
              href="mailto:contact@brief-ai.fr"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-land-accent px-5 text-[15px] font-medium text-land-accent-ink transition-[filter] hover:brightness-110"
            >
              contact@brief-ai.fr <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </article>
      </div>
    </SiteChrome>
  );
}
