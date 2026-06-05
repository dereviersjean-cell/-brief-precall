import { Meeting } from "./types";

export const mockMeetings: Meeting[] = [
  {
    id: "1",
    date: "2026-06-06T10:00:00",
    duration: 45,
    company: "Mistral AI",
    industry: "Intelligence Artificielle",
    website: "mistral.ai",
    status: "upcoming",
    contacts: [
      {
        name: "Arthur Mensch",
        title: "CEO & Co-fondateur",
        linkedin: "linkedin.com/in/arthurmensch",
        email: "arthur@mistral.ai",
        notes: "Très technique, préfère les discussions chiffrées.",
      },
      {
        name: "Sofia Roux",
        title: "Head of Sales",
        email: "sofia@mistral.ai",
        notes: "Point de contact principal pour la négociation commerciale.",
      },
    ],
    brief: {
      companyOverview:
        "Mistral AI est une startup française fondée en 2023, spécialisée dans les modèles de langage open-source. Valorisée à 6 milliards d'euros suite à sa dernière levée de fonds, elle est considérée comme le champion européen de l'IA générative face aux géants américains.",
      revenue: "~40M€ ARR estimé",
      employees: "~250 employés",
      recentNews: [
        "Levée de fonds Série B de 600M€ en juin 2024, menée par General Catalyst.",
        "Lancement de Mistral Large 2, concurrent direct de GPT-4o selon les benchmarks.",
        "Partenariat stratégique avec Microsoft Azure pour la distribution de leurs modèles.",
        "Ouverture d'un bureau à San Francisco pour accélérer la croissance US.",
      ],
      painPoints: [
        {
          title: "Scalabilité de l'infra",
          detail:
            "Croissance rapide du nombre de clients API — besoin d'une infrastructure capable de supporter des pics de charge imprévisibles sans dégradation.",
        },
        {
          title: "Gestion des équipes distribuées",
          detail:
            "Équipes réparties entre Paris, Londres et SF. La coordination et le partage de contexte entre les commerciaux est un enjeu clé.",
        },
        {
          title: "Cycles de vente enterprise",
          detail:
            "Ventes aux grands comptes (banques, CAC40) avec des cycles longs. Besoin d'outils pour maintenir le contexte sur 3 à 6 mois de négociation.",
        },
      ],
      talkingPoints: [
        {
          title: "ROI sur le temps de préparation",
          detail:
            "Les équipes sales de Mistral préparent des dizaines de démos par semaine. Brief peut réduire ce temps de 2h à 15 minutes par rendez-vous.",
        },
        {
          title: "Intégration avec leur stack existant",
          detail:
            "Ils utilisent Salesforce CRM — notre intégration native peut pré-remplir les briefs depuis les données CRM existantes.",
        },
        {
          title: "Cas d'usage IA interne",
          detail:
            "En tant qu'acteur IA, ils seront sensibles à notre approche de génération de briefs. Montrer les prompts et l'architecture peut créer de la confiance.",
        },
      ],
      objectives: [
        "Qualifier le besoin et identifier le budget disponible (Q3 2026)",
        "Obtenir un accès à 3 commerciaux pour un POC de 2 semaines",
        "Valider l'intégration Salesforce comme deal-breaker ou nice-to-have",
      ],
      competitorsUsed: ["Notion AI", "ChatGPT", "Clari"],
      suggestedOpeningLine:
        "J'ai vu que vous venez d'ouvrir à San Francisco — comment vous gérez la préparation des calls quand vos commerciaux sont sur 3 fuseaux horaires différents ?",
    },
  },
  {
    id: "2",
    date: "2026-06-06T14:30:00",
    duration: 30,
    company: "Doctrine",
    industry: "LegalTech",
    website: "doctrine.fr",
    status: "upcoming",
    contacts: [
      {
        name: "Nicolas Bustamante",
        title: "CEO & Co-fondateur",
        linkedin: "linkedin.com/in/nicolasbustamante",
        notes: "Avocat de formation, très orienté ROI et cas concrets.",
      },
    ],
    brief: {
      companyOverview:
        "Doctrine est la principale plateforme française de recherche juridique IA, utilisée par plus de 15 000 professionnels du droit. La plateforme agrège jurisprudence, doctrine et textes de loi pour en faciliter l'analyse.",
      revenue: "~15M€ ARR",
      employees: "~120 employés",
      recentNews: [
        "Levée de fonds de 30M€ en série B pour accélérer l'expansion en Europe.",
        "Lancement de Doctrine AI Assistant, leur propre LLM fine-tuné sur le droit français.",
        "Partenariat avec le Barreau de Paris pour former les avocats à l'IA juridique.",
      ],
      painPoints: [
        {
          title: "Ventes aux cabinets d'avocats",
          detail:
            "Cycles de vente longs avec des décisionnaires multiples (associés + DSI). Besoin de personnaliser le discours commercial par profil.",
        },
        {
          title: "Démonstration de valeur rapide",
          detail:
            "Les avocats sont sceptiques vis-à-vis des outils tech. Il faut montrer un ROI concret dès les premières minutes du call.",
        },
      ],
      talkingPoints: [
        {
          title: "Personnalisation par segment",
          detail:
            "Brief peut générer des accroches différentes selon que l'interlocuteur est un associé senior ou un DSI de cabinet.",
        },
        {
          title: "Conformité et confidentialité",
          detail:
            "Dans le secteur juridique, la confidentialité des données est critique. Insister sur notre architecture zero-data-retention.",
        },
      ],
      objectives: [
        "Présenter la roadmap intégration CRM (HubSpot qu'ils utilisent)",
        "Identifier si le besoin est au niveau de l'équipe sales ou marketing",
      ],
      competitorsUsed: ["HubSpot Sequences", "Apollo.io"],
      suggestedOpeningLine:
        "Avec votre expansion en Europe, comment votre équipe adapte-t-elle son discours commercial aux spécificités légales de chaque pays ?",
    },
  },
  {
    id: "3",
    date: "2026-06-09T09:00:00",
    duration: 60,
    company: "Pennylane",
    industry: "FinTech / Comptabilité",
    website: "pennylane.com",
    status: "upcoming",
    contacts: [
      {
        name: "Arthur Waller",
        title: "CEO",
        linkedin: "linkedin.com/in/arthurwaller",
        notes: "Fondateur très impliqué dans le produit. Références à Xero.",
      },
      {
        name: "Julie Dupont",
        title: "VP Sales",
        email: "julie@pennylane.com",
        notes: "Opérationnelle, cherche des solutions scalables rapidement.",
      },
    ],
    brief: {
      companyOverview:
        "Pennylane est une plateforme comptable tout-en-un pensée pour les PME et leurs experts-comptables. Fondée en 2020, elle a levé plus de 100M€ et revendique 200 000 entreprises utilisatrices en France.",
      revenue: "~30M€ ARR",
      employees: "~350 employés",
      recentNews: [
        "Annonce du rachat de la startup SpendDesk pour compléter l'offre gestion des dépenses.",
        "Lancement de Pennylane AI pour l'automatisation de la saisie comptable.",
        "Expansion en Espagne et en Allemagne prévue pour fin 2026.",
      ],
      painPoints: [
        {
          title: "Onboarding des partenaires comptables",
          detail:
            "Pennylane convertit des cabinets comptables en partenaires — chaque nouveau cabinet nécessite formation et accompagnement commercial.",
        },
        {
          title: "Volume de calls élevé",
          detail:
            "L'équipe sales fait plus de 500 calls/semaine avec des PME aux profils très variés. La préparation manuelle est impossible à ce volume.",
        },
      ],
      talkingPoints: [
        {
          title: "Scalabilité à 500 calls/semaine",
          detail:
            "Brief est conçu pour les équipes à fort volume. L'automatisation par webhook depuis leur CRM peut générer les briefs 24h avant chaque RDV.",
        },
        {
          title: "Segmentation par taille d'entreprise",
          detail:
            "Nos templates de brief s'adaptent automatiquement selon le CA de la PME prospect — angle TPE vs ETI très différent.",
        },
      ],
      objectives: [
        "Décrocher un pilote avec 10 commerciaux sur le segment PME",
        "Valider le workflow d'automatisation via webhook HubSpot",
        "Obtenir une validation de la VP Sales avant présentation au board",
      ],
      competitorsUsed: ["Salesloft", "Outreach", "ChatGPT"],
      suggestedOpeningLine:
        "Avec 500 calls par semaine, comment vos commerciaux s'assurent-ils que chaque prospect sent qu'on s'est vraiment préparé pour lui ?",
    },
  },
  {
    id: "4",
    date: "2026-06-10T11:00:00",
    duration: 45,
    company: "Alan",
    industry: "InsurTech / Santé",
    website: "alan.com",
    status: "upcoming",
    contacts: [
      {
        name: "Charles Gorintin",
        title: "CEO & Co-fondateur",
        email: "charles@alan.com",
        notes: "Ingénieur de formation, très analytique. Aime les données.",
      },
    ],
    brief: {
      companyOverview:
        "Alan est la première assurance santé 100% digitale en Europe, présente en France, Espagne et Belgique. Avec plus de 500 000 membres et une valorisation de 4 milliards d'euros, Alan réinvente l'expérience santé en entreprise.",
      employees: "~600 employés",
      recentNews: [
        "Lancement d'Alan Minds, offre de santé mentale intégrée pour les entreprises.",
        "Levée de fonds de 173M€ pour financer l'expansion européenne.",
        "Partenariat avec des réseaux de médecins pour des consultations 24/7.",
      ],
      painPoints: [
        {
          title: "Vente aux DRH",
          detail:
            "Les décideurs sont souvent des DRH avec peu de temps — les appels doivent être très ciblés et courts (< 20 min).",
        },
        {
          title: "Concurrence avec les courtiers traditionnels",
          detail:
            "Les prospects comparent souvent Alan à des offres d'assureurs traditionnels via des courtiers — il faut désamorcer cette comparaison.",
        },
      ],
      talkingPoints: [
        {
          title: "Brief adapté aux DRH",
          detail:
            "Template orienté RH : turnover, bien-être employé, coût par salarié — le langage que les DRH comprennent.",
        },
        {
          title: "Rapidité d'exécution",
          detail:
            "Pour Alan qui valorise la vitesse, montrer que Brief est opérationnel en 48h sans intégration technique lourde.",
        },
      ],
      objectives: [
        "Identifier si le besoin vient de l'équipe sales B2B ou du marketing",
        "Évaluer l'appétit pour une intégration avec leur CRM interne (stack custom)",
      ],
      competitorsUsed: ["Notion", "LinkedIn Sales Navigator"],
      suggestedOpeningLine:
        "Vos commerciaux vendent aux DRH de milliers d'entreprises en même temps — comment ils évitent de sonner générique sur chaque call ?",
    },
  },
  {
    id: "5",
    date: "2026-06-04T10:00:00",
    duration: 30,
    company: "Contentsquare",
    industry: "Analytics / SaaS",
    website: "contentsquare.com",
    status: "completed",
    contacts: [
      {
        name: "Jonathan Cherki",
        title: "CEO",
      },
    ],
    brief: {
      companyOverview:
        "Contentsquare est une plateforme d'analytics d'expérience digitale valorisée à 5,6 milliards de dollars. Elle analyse le comportement des utilisateurs sur les sites web et apps pour optimiser les conversions.",
      recentNews: [],
      painPoints: [],
      talkingPoints: [],
      objectives: ["Follow-up suite à la démo du 15 mai"],
    },
  },
];

export function getMeetingById(id: string): Meeting | undefined {
  return mockMeetings.find((m) => m.id === id);
}

export function getUpcomingMeetings(): Meeting[] {
  return mockMeetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
