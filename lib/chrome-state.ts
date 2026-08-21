// Forme de la réponse de /api/chrome, partagée par les trois composants
// d'habillage. Un type commun plutôt que trois déclarations parallèles : ils
// consomment littéralement la même réponse, via le même appel réseau
// mutualisé par fetchJsonOnce.
export type ChromeState = {
  impersonation: { active: boolean; targetUserName?: string };
  organizationName: string | null;
  billingStatus: string;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  seatCount: number;
};
