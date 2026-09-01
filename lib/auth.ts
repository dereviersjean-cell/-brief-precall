import { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { resolveUserForLogin, saveGoogleTokens, getUserRole, type AuthProvider } from "./db";
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
          // calendar.events (not calendar.readonly) — module Distribution
          // Flexible sous-étape B needs to write the pre-call brief into the
          // event description, not just read events. IMPORTANT: this only
          // takes effect for NEW sign-ins/consents. Every user who already
          // logged in before this change has a refresh_token scoped to
          // whatever they granted at that time (calendar.readonly) —
          // changing the requested scope in code does not retroactively
          // upgrade tokens already issued. Existing users must sign out and
          // sign back in (or otherwise re-trigger Google's consent screen)
          // before calendar writes will work for them; until then,
          // hasCalendarWriteAccess(userId) (lib/google-calendar.ts) reports
          // false for them and the calendar channel is skipped, not failed.
          //
          // Brief ne lit plus rien dans Gmail — il n'y écrit qu'en envoyant.
          //
          // gmail.readonly a été retiré le 25/07/2026 : scope Restricted, donc
          // audit de sécurité tiers annuel et payant (CASA) pour sortir du mode
          // Testing. Décision : rester gratuit, accepter la perte. Il avait été
          // remplacé par gmail.metadata (en-têtes seulement) pour la détection
          // des réponses.
          //
          // gmail.metadata a été retiré à son tour le 19/08/2026, au moment de
          // préparer la vérification Google. Motif : toute lecture de Gmail est
          // la zone la plus scrutée de l'examen, et la détection de réponse ne
          // valait pas le risque d'allonger de plusieurs semaines une
          // vérification dont dépend l'ingestion de TOUS les utilisateurs
          // (mode Testing = refresh tokens expirés à 7 jours). Supprimés avec
          // lui : checkThreadReply, la route /api/feedback/check-reply, le
          // badge « le prospect a répondu » et les indicateurs de taux de
          // réponse — ces derniers auraient affiché 0 % à perpétuité.
          //
          // Il ne reste donc que gmail.send, et la colonne calls.replied_at
          // conserve l'historique sans plus jamais être alimentée.
          //
          // Même réserve de re-consentement que pour calendar.events ci-dessus :
          // les utilisateurs existants gardent la forme de leur ancien jeton
          // tant qu'ils ne se reconnectent pas.
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/gmail.send",
          ].join(" "),
          access_type: "offline",
          // PAS de prompt=consent ici, volontairement : il forcerait l'écran
          // d'autorisation Google à CHAQUE connexion, pas seulement à la
          // première. Essayé le 01/09/2026 au lendemain de l'approbation de
          // la vérification, retiré le jour même — le login quotidien doit
          // rester direct.
          //
          // Conséquence à connaître : Google ne renvoie un refresh_token
          // qu'au tout premier consentement d'un compte, ou quand on reforce
          // explicitement l'écran. Une simple déconnexion/reconnexion rend
          // donc un access_token frais mais AUCUN refresh_token, et
          // saveGoogleTokens (lib/db.ts) conserve alors l'ancien
          // (`if (refreshToken)`) : un compte dont le refresh_token est mort
          // ne peut pas se réparer en se reconnectant normalement, et rien
          // ne le signale.
          //
          // Le chemin de réparation est donc explicite et vit ailleurs : le
          // bouton « Se reconnecter avec Google » de
          // app/settings/connexions/ConnexionsSettingsClient.tsx passe
          // prompt=consent en authorizationParams de signIn(). Il s'affiche
          // tout seul, via hasCalendarWriteAccess (lib/google-calendar.ts),
          // aux comptes dont le jeton est mort ou resté en calendar.readonly
          // — c'est-à-dire exactement ceux qui en ont besoin.
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
              token.roleRefreshedAt = Date.now();

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

      // Subsequent calls — re-read the role from DB at most every 10 min.
      // token.role is otherwise only set at sign-in, so a commercial promoted
      // to manager (or the reverse) kept a stale role until re-login: the
      // sidebar "Équipe" entry and the settings tabs read session.role.
      // Server routes are unaffected (they already re-read the role from DB).
      const ROLE_REFRESH_MS = 10 * 60 * 1000;
      const refreshedAt = typeof token.roleRefreshedAt === "number" ? token.roleRefreshedAt : 0;
      if (typeof token.supabaseUserId === "string" && Date.now() - refreshedAt > ROLE_REFRESH_MS) {
        try {
          const freshRole = await getUserRole(token.supabaseUserId);
          token.role = freshRole ?? undefined;
          token.roleRefreshedAt = Date.now();
        } catch (err) {
          // Keep the existing role on transient DB errors; retry next call.
          console.error("[auth] jwt role refresh failed:", err);
        }
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
