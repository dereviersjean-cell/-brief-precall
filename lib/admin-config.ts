import { getAdminConfig, setAdminConfig } from "./db";

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
