import { timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { CREDENTIALS_ADMIN_SESSION_EMAIL, parseEmailList } from "@/lib/admin-config";

function secureEqualStrings(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function buildProviders(): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [];

  const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (googleId && googleSecret) {
    providers.push(
      GoogleProvider({
        clientId: googleId,
        clientSecret: googleSecret,
      }),
    );
  }

  const cu = process.env.NEXTAUTH_CREDENTIALS_USER?.trim();
  const cp = process.env.NEXTAUTH_CREDENTIALS_PASSWORD;
  if (cu && cp != null && String(cp).length > 0) {
    providers.push(
      CredentialsProvider({
        id: "credentials",
        name: "Usuario y contraseña",
        credentials: {
          username: { label: "Usuario", type: "text" },
          password: { label: "Contraseña", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.username || credentials.password == null) return null;
          const username = credentials.username.trim();
          const password = String(credentials.password);
          if (
            secureEqualStrings(username, cu) &&
            secureEqualStrings(password, String(cp))
          ) {
            return {
              id: "credentials",
              name: username,
              email: CREDENTIALS_ADMIN_SESSION_EMAIL,
            };
          }
          return null;
        },
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials") {
        return true;
      }
      const allowed = parseEmailList(process.env.ALLOWED_USER_EMAILS);
      if (allowed.length === 0) return true;
      const email = (user.email ?? "").toLowerCase();
      return allowed.includes(email);
    },
    async jwt({ token, user, account }) {
      if (user?.email) token.email = user.email;
      if (account?.provider) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};
