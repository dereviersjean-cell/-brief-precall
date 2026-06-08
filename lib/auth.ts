import { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { upsertUser } from "./db";

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
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        if (user?.email) {
          try {
            const dbUser = await upsertUser(
              user.email,
              user.name ?? null,
              user.image ?? null
            );
            token.supabaseUserId = dbUser?.id;
          } catch (err) {
            console.error("[auth] upsertUser failed:", err);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.supabaseUserId = token.supabaseUserId as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
