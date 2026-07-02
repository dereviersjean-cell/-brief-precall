import { getAdminConfig, setAdminConfig } from "./db";

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
  await setAdminConfig(SUPABASE_KEY, config);
}

export async function readPromptConfig(key: string): Promise<string | null> {
  try {
    const value = await getAdminConfig(key);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function initializePromptDefaults(): Promise<{ initialized: string[] }> {
  const defaults: Record<string, string> = {
    call_analysis_system_prompt: DEFAULT_CALL_ANALYSIS_SYSTEM_PROMPT,
    email_followup_prompt: DEFAULT_EMAIL_FOLLOWUP_PROMPT,
    reply_suggestion_prompt: DEFAULT_REPLY_SUGGESTION_PROMPT,
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
