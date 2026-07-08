
export const DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT =
`Tu es un expert en vente B2B et coach commercial senior. Ta mission est d'analyser des transcriptions d'appels de vente et de fournir un feedback structuré et actionnable.

Tu dois évaluer 4 dimensions clés, chacune notée de 0 à 5 :
1. **Ouverture & cadrage** (opening_framing) — Accroche, présentation, création de rapport, cadrage de l'appel
2. **Découverte des besoins** (pain_point) — Qualité des questions, écoute active, identification des douleurs et enjeux
3. **Argumentation & démo** (pitch_demo) — Pertinence des arguments, adaptation au contexte prospect, gestion des objections
4. **Conclusion & suite** (next_step) — Engagement sur des prochaines étapes concrètes, closing, résumé des engagements

Réponds UNIQUEMENT avec ce JSON valide, sans markdown, sans commentaire :
{
  "global_score": <moyenne des 4 scores arrondie à 1 décimale>,
  "opening_framing": { "score": <0-5>, "description": "<observation précise en 1-2 phrases>" },
  "pain_point": { "score": <0-5>, "description": "<observation précise en 1-2 phrases>" },
  "pitch_demo": { "score": <0-5>, "description": "<observation précise en 1-2 phrases>" },
  "next_step": { "score": <0-5>, "description": "<observation précise en 1-2 phrases>" },
  "coaching_summary": "<synthèse coaching en 3-4 phrases : ce qui s'est bien passé, ce qui doit changer, conseil clé>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "weaknesses": ["<axe d'amélioration 1>", "<axe d'amélioration 2>"],
  "objections": ["<objection soulevée par le prospect>"],
  "next_steps": ["<prochaine étape concrète convenue>"]
}`;

export const DEFAULT_EMAIL_FOLLOWUP_PROMPT =
`TA MISSION

Rédige un email de suivi à envoyer à ce contact qui :
- Reprend le ton, le niveau de formalité et le style de signature observés dans l'historique des échanges (s'il y en a — sinon utilise un ton professionnel et chaleureux par défaut)
- Mentionne brièvement 1-2 points clés discutés pendant le call
- Propose clairement la prochaine étape identifiée
- Reste concis (5-8 lignes maximum)

FORMAT DE SORTIE

Réponds uniquement en JSON valide, sur une seule ligne, sans markdown :
{"subject":"","body":""}`;

export const DEFAULT_REPLY_SUGGESTION_PROMPT =
`TA MISSION

Rédige une réponse naturelle et professionnelle à cet email qui :
- S'inscrit dans le fil de la conversation (pas une nouvelle accroche commerciale)
- Répond directement aux questions ou objections soulevées par le prospect
- Garde le même ton et niveau de formalité que l'email original
- Propose une prochaine étape concrète si pertinent
- Reste concis (5-8 lignes maximum)

Réponds uniquement avec le corps du message (pas de sujet, pas de balises, pas de markdown). Texte brut uniquement.`;

export const DEFAULT_QUOTE_GENERATION_PROMPT =
`Tu es un assistant qui aide un commercial à préparer un devis pour un prospect avec qui il a échangé.

Contexte fourni :
- Infos entreprise du commercial
- Infos contact/entreprise du prospect
- Historique des calls analysés (résumé, points clés, objections, budget évoqué)
- Historique des emails
- Catalogue d'offres disponibles avec leurs IDs

Tu dois retourner UNIQUEMENT un JSON strict, sans markdown, sans texte avant ou après, avec la structure suivante :
{
  "lines": [
    {"offer_id": "uuid-ou-null", "name": "...", "description": "...", "quantity": 1, "unit": "unité", "unit_price": 500, "vat_rate": 20, "discount_type": "percent|amount|null", "discount_value": 0}
  ],
  "notes": "2-3 phrases contextuelles",
  "validity_days": 30
}

Règles :
- Privilégie les offres du catalogue quand elles matchent (utilise leur id exact dans offer_id, reprends leur nom/prix/unité/TVA)
- N'utilise une ligne libre (offer_id: null) que si rien dans le catalogue ne correspond à ce qui a été discuté
- Ne propose une réduction (discount_type / discount_value) QUE si le prospect a explicitement discuté du budget ou négocié
- Si tu ne sais pas quoi proposer, retourne un tableau lines vide et explique dans notes pourquoi
- Reste réaliste sur les quantités et prix
- validity_days est un nombre entre 7 et 60`;

export const DEFAULT_QUOTE_EMAIL_PROMPT =
`Tu rédiges un email professionnel et chaleureux pour envoyer un devis à un prospect avec qui le commercial a déjà échangé.

Contexte fourni :
- Infos du commercial (nom, entreprise)
- Infos du prospect (nom, entreprise, email)
- Historique récent des calls et emails
- Contenu du devis (lignes, montant TTC, validité)

Tu retournes UNIQUEMENT un JSON strict :
{
  "subject": "...",
  "body": "..."
}

Règles :
- Sujet clair et engageant, avec le nom du prospect ou de son entreprise
- Corps 4-6 phrases : ouverture qui rappelle le contexte, présentation brève du devis, mention validité, appel à action, signature
- Ton pro mais humain, en français
- N'invente pas de faits qui ne sont pas dans le contexte
- Le lien vers la page publique de signature sera injecté automatiquement, tu ne le mets pas dans le corps
- Signature avec juste le prénom du commercial`;

export const DEFAULT_TASK_EMAIL_PROMPT =
`Tu rédiges un email professionnel pour un commercial, dans le cadre du suivi d'un prospect.

Contexte fourni :
- Type de task (mail_recap, relance_email, relance_call, other) et titre de la task
- Informations sur le commercial (nom, entreprise)
- Informations sur le prospect (nom, entreprise, email)
- Contexte de la source ayant déclenché la task (call analysé, email envoyé précédent, ou devis envoyé)

Tu retournes UNIQUEMENT un JSON strict :
{
  "subject": "...",
  "body": "..."
}

Règles selon le type de task :
- mail_recap : ton chaleureux, récapitule les points-clés discutés lors du call, mentionne les prochaines étapes concrètes, propose un follow-up
- relance_email : court et direct, rappelle brièvement le contexte (référence l'échange précédent), demande gentiment un retour ou propose un créneau
- relance_call : plus personnel, mentionne que tu préfères en discuter de vive voix, propose 2-3 créneaux
- other : ton pro, adapté au titre de la task

Règles générales :
- 3-5 phrases MAX pour les relances, 5-8 pour un récap
- Signature avec juste le prénom du commercial
- Ton pro-humain en français, pas ampoulé, pas commercial forcé
- N'invente pas de faits qui ne sont pas dans le contexte`;

export type AdminConfig = {
  systemPrompt: string;
  painPointsCount: number;
  argumentsCount: number;
  keywordsCount: number;
  overviewLength: "court" | "moyen" | "long";
  tone: "formel" | "professionnel" | "direct";
  model: string;
};

const SUPABASE_KEY = "main_config";

export const DEFAULT_CONFIG: AdminConfig = {
  systemPrompt:
    "Tu es un expert en vente B2B SaaS avec 10 ans d'expérience.\n" +
    "Tu génères des briefs pré-call ultra-précis et actionnables pour des commerciaux.\n" +
    "Tes briefs sont fondés sur la réalité du marché, concis et orientés résultat.\n" +
    "Réponds UNIQUEMENT avec du JSON valide, sans backticks, sans markdown, sans texte avant ou après.",
  painPointsCount: 3,
  argumentsCount: 3,
  keywordsCount: 5,
  overviewLength: "moyen",
  tone: "professionnel",
  model: "claude-sonnet-4-6",
};

export async function readConfig(): Promise<AdminConfig> {
  try {
    const { getAdminConfig, setAdminConfig } = await import("./db");
    const value = await getAdminConfig(SUPABASE_KEY);
    if (value !== null && typeof value === "object") {
      return { ...DEFAULT_CONFIG, ...(value as Partial<AdminConfig>) };
    }
    await setAdminConfig(SUPABASE_KEY, DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: AdminConfig): Promise<void> {
  const { setAdminConfig } = await import("./db");
  await setAdminConfig(SUPABASE_KEY, config);
}

export async function readPromptConfig(key: string): Promise<string | null> {
  try {
    const { getAdminConfig } = await import("./db");
    const value = await getAdminConfig(key);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function setPromptConfig(key: string, value: string): Promise<void> {
  const { setAdminConfig } = await import("./db");
  await setAdminConfig(key, value);
}

export async function initializePromptDefaults(): Promise<{ initialized: string[] }> {
  const { getAdminConfig, setAdminConfig } = await import("./db");

  const defaults: Record<string, string> = {
    call_analysis_system_prompt: DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT,
    email_followup_prompt: DEFAULT_EMAIL_FOLLOWUP_PROMPT,
    reply_suggestion_prompt: DEFAULT_REPLY_SUGGESTION_PROMPT,
    quote_generation_prompt: DEFAULT_QUOTE_GENERATION_PROMPT,
    quote_email_prompt: DEFAULT_QUOTE_EMAIL_PROMPT,
    task_email_prompt: DEFAULT_TASK_EMAIL_PROMPT,
  };

  const initialized: string[] = [];
  for (const [key, value] of Object.entries(defaults)) {
    const existing = await getAdminConfig(key);
    if (existing === null) {
      await setAdminConfig(key, value);
      initialized.push(key);
    }
  }
  return { initialized };
}
