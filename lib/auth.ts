import { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { resolveUserForLogin, saveGoogleTokens, type AuthProvider } from "./db";
import { refreshGoogleAccessToken } from "./gmail";

function toAuthProvider(nextAuthProvider: string): AuthProvider | null {
  if (nextAuthProvider === "google") return "google";
  if (nextAuthProvider === "azure-ad") return "microsoft";
  return null;
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
          ].join(" "),
          access_type: "offline",
        },
      },
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid email profile offline_access https://graph.microsoft.com/Calendars.Read",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // Runs before jwt() — the only place that can actually refuse a sign-in
    // (returning false here prevents a session from ever being created).
    async signIn({ user, account }) {
      if (!account || !user?.email || !user?.id) return false;
      const provider = toAuthProvider(account.provider);
      if (!provider) return false;

      try {
        const resolution = await resolveUserForLogin({
          email: user.email,
          name: user.name ?? null,
          avatarUrl: user.image ?? null,
          provider,
          providerId: user.id,
        });

        if (resolution.status === "disabled") {
          console.error(`[auth] signIn refused — account disabled for ${user.email}`);
          return false;
        }
        if (resolution.status === "conflict") {
          console.error(`[auth] signIn refused — ${user.email} is already linked to a different ${provider} account`);
          return false;
        }
        return true;
      } catch (err) {
        console.error("[auth] signIn resolveUserForLogin failed:", err);
        return false;
      }
    },

    async jwt({ token, account, user }) {
      // First login — account is present
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;

        if (account.expires_at) {
          token.accessTokenExpires = account.expires_at * 1000;
        } else if (account.expires_in) {
          token.accessTokenExpires = Date.now() + (account.expires_in as number) * 1000;
        }

        // signIn() already resolved (and possibly created/linked) this row —
        // this re-matches the same row to read back id/role for the token.
        const provider = toAuthProvider(account.provider);
        if (provider && user?.email && user?.id) {
          try {
            const resolution = await resolveUserForLogin({
              email: user.email,
              name: user.name ?? null,
              avatarUrl: user.image ?? null,
              provider,
              providerId: user.id,
            });

            if (resolution.status === "ok") {
              token.supabaseUserId = resolution.userId;
              token.role = resolution.role ?? undefined;

              if (provider === "google" && account.access_token) {
                try {
                  await saveGoogleTokens(resolution.userId, account.access_token, account.refresh_token);
                } catch (err) {
                  console.error("[auth] saveGoogleTokens failed:", err);
                }
              }
            }
          } catch (err) {
            console.error("[auth] jwt resolveUserForLogin failed:", err);
          }
        }

        return token;
      }

      // Subsequent calls — refresh Google token if expired
      if (
        token.provider === "google" &&
        typeof token.accessTokenExpires === "number" &&
        Date.now() >= token.accessTokenExpires &&
        typeof token.refreshToken === "string"
      ) {
        try {
          const newAccessToken = await refreshGoogleAccessToken(token.refreshToken);
          token.accessToken = newAccessToken;
          token.accessTokenExpires = Date.now() + 3600 * 1000;
          delete token.error;
        } catch (err) {
          console.error("[auth] refreshGoogleAccessToken failed:", err);
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.refreshToken = token.refreshToken as string | undefined;
      session.supabaseUserId = token.supabaseUserId as string | undefined;
      session.provider = token.provider as string | undefined;
      session.role = token.role;
      if (token.error) {
        session.error = token.error as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
