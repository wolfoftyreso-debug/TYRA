import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { verifyPassword } from "./password";
import { getUserByEmail } from "./users";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await getUserByEmail({ email });
        if (!user) return null;
        const ok = await verifyPassword({
          password,
          passwordHash: user.password_hash
        });
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub) {
        session.user = {
          id: token.sub,
          name: (token.name as string | null | undefined) ?? null,
          email: (token.email as string | null | undefined) ?? null
        };
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};

export function auth() {
  return getServerSession(authOptions);
}

export const nextAuthHandler = NextAuth(authOptions);

