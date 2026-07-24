import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Brief",
  description: "Comment Brief (Oliverlist) collecte, utilise et protège vos données, y compris les données de votre compte Google.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-[18px] font-semibold text-ink tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <article>
      <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">Confidentialité</span>
      <h1 className="mt-3 text-[32px] md:text-[38px] leading-tight font-bold tracking-[-0.03em] text-ink">
        Politique de <span className="italic-serif text-primary">confidentialité</span>.
      </h1>
      <p className="mt-3 text-[13px] text-muted-foreground">Dernière mise à jour : 25 juillet 2026.</p>

      <Section title="Qui sommes-nous">
        <p>
          Brief est édité par <b className="text-ink">Oliverlist</b> (« nous »), société éditrice basée en France.
          Brief est un logiciel de préparation et d&apos;analyse de rendez-vous commerciaux B2B, réservé aux équipes
          commerciales qui y sont invitées — il n&apos;y a pas d&apos;inscription libre.
        </p>
        <p>
          Pour toute question relative à cette politique ou à vos données, vous pouvez nous écrire à{" "}
          <a href="mailto:hello@oliverlist.com" className="text-ink font-medium hover:text-primary transition-colors">
            hello@oliverlist.com
          </a>
          .
        </p>
      </Section>

      <Section title="Les données que nous collectons">
        <p>Lorsque vous connectez votre compte Google (ou Microsoft) à Brief, nous accédons, avec votre consentement explicite au moment de la connexion, aux données suivantes :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><b className="text-ink">Identité</b> — nom, adresse email et photo de profil de votre compte Google/Microsoft.</li>
          <li><b className="text-ink">Agenda</b> — les événements de votre calendrier (horaires, participants, titre du rendez-vous), et la possibilité d&apos;écrire dans la description d&apos;un événement pour y déposer votre brief pré-rendez-vous.</li>
          <li><b className="text-ink">Emails</b> — l&apos;historique des échanges avec un contact précis (pour vous donner du contexte avant un rendez-vous et détecter les réponses à vos relances), et l&apos;envoi d&apos;emails à votre initiative (relance, devis) depuis votre propre boîte Gmail, en votre nom.</li>
        </ul>
        <p>
          Nous ne demandons jamais un accès plus large que nécessaire (par exemple, nous ne lisons pas l&apos;intégralité
          de votre boîte mail indépendamment d&apos;un contact précis lié à un rendez-vous).
        </p>
        <p>Selon les intégrations que vous ou votre organisation activez, nous pouvons aussi traiter :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>L&apos;enregistrement, la transcription et l&apos;analyse de vos visios (Google Meet, Teams, Zoom), lorsqu&apos;un bot Brief y est invité.</li>
          <li>Les données de vos contacts et opportunités issues d&apos;un CRM connecté (HubSpot, Pipedrive).</li>
          <li>Le contenu d&apos;un playbook commercial importé depuis Notion, Word ou PDF.</li>
          <li>Des informations publiques sur les entreprises de vos prospects (registre légal français, actualités).</li>
        </ul>
      </Section>

      <Section title="Pourquoi nous utilisons ces données">
        <p>Ces données servent exclusivement à faire fonctionner les fonctionnalités de Brief pour vous :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Générer un dossier de préparation avant chaque rendez-vous.</li>
          <li>Transcrire et analyser vos appels selon le playbook de votre équipe.</li>
          <li>Rédiger des brouillons d&apos;email de suivi et détecter les réponses de vos prospects.</li>
          <li>Vous permettre de vous entraîner sur les objections que vous avez rencontrées.</li>
          <li>Donner à votre manager une vue agrégée de la performance de l&apos;équipe.</li>
        </ul>
        <p>
          Notre utilisation et notre transfert des informations reçues des API Google respectent la{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink font-medium hover:text-primary transition-colors"
          >
            Google API Services User Data Policy
          </a>
          , y compris ses exigences d&apos;utilisation limitée (Limited Use). En particulier, les données issues de
          votre compte Google ne sont jamais utilisées à des fins publicitaires, ne sont jamais revendues, et ne
          servent jamais à entraîner des modèles d&apos;intelligence artificielle génériques — uniquement à générer,
          pour vous, les briefs, analyses et brouillons décrits ci-dessus.
        </p>
      </Section>

      <Section title="Avec qui nous partageons des données">
        <p>
          Nous ne vendons aucune donnée. Certains traitements sont sous-traités à des prestataires, chacun n&apos;ayant
          accès qu&apos;aux données nécessaires à sa tâche :
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><b className="text-ink">Anthropic</b> — génération des briefs, analyse des transcriptions, rédaction des brouillons d&apos;email (modèles Claude).</li>
          <li><b className="text-ink">Recall.AI</b> (région Europe) — enregistrement et transcription des visios.</li>
          <li><b className="text-ink">Supabase</b> — hébergement de la base de données de l&apos;application.</li>
          <li><b className="text-ink">Voyage AI</b> — indexation sémantique de votre bibliothèque d&apos;objections et de vos références clients.</li>
          <li><b className="text-ink">Resend</b> — envoi des emails transactionnels de Brief (notifications, résumés hebdomadaires).</li>
          <li><b className="text-ink">Stripe</b> — facturation de votre organisation.</li>
          <li><b className="text-ink">Pappers</b> — données légales publiques sur les entreprises françaises.</li>
          <li>Le cas échéant : <b className="text-ink">HubSpot, Pipedrive, Notion, Slack</b> — uniquement si vous ou votre organisation connectez ces outils.</li>
        </ul>
        <p>Nous pouvons également communiquer des données si la loi nous y oblige, ou pour protéger nos droits, notre sécurité ou celle de nos utilisateurs.</p>
      </Section>

      <Section title="Hébergement et localisation">
        <p>
          Les enregistrements et transcriptions de vos visios sont traités en Europe (région eu-central-1 de
          Recall.AI). Nous nous efforçons de privilégier des prestataires et des hébergements européens ou conformes
          au RGPD pour l&apos;ensemble de nos traitements.
        </p>
      </Section>

      <Section title="Combien de temps nous conservons vos données">
        <p>
          Nous conservons vos données le temps nécessaire à la fourniture du service, tant que votre compte est actif
          au sein de votre organisation. Les enregistrements vidéo de vos visios ne sont jamais stockés durablement
          par Brief : nous conservons la transcription et l&apos;analyse qui en sont issues, pas la vidéo elle-même.
          En cas de résiliation de l&apos;abonnement de votre organisation ou de suppression de votre compte, vos
          données sont supprimées ou anonymisées dans un délai raisonnable, sauf obligation légale de conservation
          plus longue (ex. facturation).
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          portabilité et d&apos;opposition sur vos données personnelles. Pour l&apos;exercer, écrivez-nous à{" "}
          <a href="mailto:hello@oliverlist.com" className="text-ink font-medium hover:text-primary transition-colors">
            hello@oliverlist.com
          </a>
          . Vous disposez également du droit d&apos;introduire une réclamation auprès de la CNIL (cnil.fr).
        </p>
        <p>
          Vous pouvez à tout moment révoquer l&apos;accès de Brief à votre compte Google depuis la page{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink font-medium hover:text-primary transition-colors"
          >
            myaccount.google.com/permissions
          </a>
          . La révocation prend effet immédiatement ; certaines fonctionnalités de Brief (agenda, email) cesseront
          alors de fonctionner jusqu&apos;à une nouvelle connexion.
        </p>
      </Section>

      <Section title="Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos données
          (chiffrement en transit, accès restreint à la base de données, isolation des données entre organisations).
          Aucun système n&apos;étant infaillible, nous ne pouvons garantir une sécurité absolue.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Brief utilise uniquement des cookies strictement nécessaires au fonctionnement du service, notamment un
          cookie de session pour vous garder connecté. Nous n&apos;utilisons pas de cookies publicitaires ou de
          traceurs tiers à des fins de suivi marketing.
        </p>
      </Section>

      <Section title="Modifications de cette politique">
        <p>
          Nous pouvons mettre à jour cette politique, par exemple lors de l&apos;ajout d&apos;une nouvelle
          fonctionnalité ou intégration. La date de mise à jour en haut de cette page reflète la dernière révision.
        </p>
      </Section>
    </article>
  );
}
