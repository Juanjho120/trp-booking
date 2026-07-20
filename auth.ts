import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import {
  ADMIN_ROLE,
  isAllowedAdminEmail,
  normalizeAdminEmail,
} from "@/lib/auth/admin-access";
import { validateServerEnv } from "@/lib/env/server";

const serverEnv = validateServerEnv();
const allowedAdminEmails = new Set(serverEnv.AUTH_ALLOWED_ADMIN_EMAILS);

function isVerifiedGoogleProfile(profile: unknown): boolean {
  if (!profile || typeof profile !== "object") {
    return false;
  }

  const emailVerified = (profile as Record<string, unknown>).email_verified;

  return emailVerified === true || emailVerified === "true";
}

export const authConfig = {
  providers: [
    Google({
      clientId: serverEnv.AUTH_GOOGLE_ID,
      clientSecret: serverEnv.AUTH_GOOGLE_SECRET,
    }),
  ],
  secret: serverEnv.AUTH_SECRET,
  trustHost: serverEnv.AUTH_TRUST_HOST,
  pages: {
    signIn: "/admin-login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    signIn({ account, profile, user }) {
      if (account?.provider !== "google") {
        return false;
      }

      if (!isVerifiedGoogleProfile(profile)) {
        return false;
      }

      return isAllowedAdminEmail(user.email, allowedAdminEmails);
    },
    jwt({ token, user }) {
      const normalizedEmail = normalizeAdminEmail(user?.email ?? token.email);

      if (normalizedEmail) {
        token.email = normalizedEmail;
      }

      if (normalizedEmail && allowedAdminEmails.has(normalizedEmail)) {
        token.role = ADMIN_ROLE;
      } else {
        delete token.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
      }

      if (session.user && token.role === ADMIN_ROLE) {
        session.user.role = ADMIN_ROLE;
      } else if (session.user) {
        delete session.user.role;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
