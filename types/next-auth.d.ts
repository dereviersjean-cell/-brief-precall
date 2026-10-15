import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    supabaseUserId?: string;
    provider?: string;
    role?: "commercial" | "manager";
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    supabaseUserId?: string;
    provider?: string;
    role?: "commercial" | "manager";
    roleRefreshedAt?: number;
    // Ce que le middleware vérifie, relu avec le rôle toutes les 10 min
    // (lib/auth.ts) : plus de requête base à chaque navigation.
    gate?: {
      disabled: boolean;
      billingBlocked: boolean;
      modules: string[];
      accessLevel: "full" | "briefs";
      needsCompany: boolean;
    };
    accessTokenExpires?: number;
    error?: string;
  }
}
