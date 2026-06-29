import { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { upsertUser, saveGoogleTokens } from "./db";
import { refreshGoogleAccessToken } from "./gmail";

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

        if (user?.email) {
          try {
            const dbUser = await upsertUser(
              user.email,
              user.name ?? null,
              user.image ?? null
            );
            token.supabaseUserId = dbUser?.id;
            if (account.provider === "google" && dbUser?.id && account.access_token) {
              try {
                await saveGoogleTokens(dbUser.id, account.access_token, account.refresh_token);
              } catch (err) {
                console.error("[auth] saveGoogleTokens failed:", err);
              }
            }
          } catch (err) {
            console.error("[auth] upsertUser failed:", err);
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
      if (token.error) {
        session.error = token.error as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
