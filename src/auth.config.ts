import type { NextAuthConfig } from "next-auth";

type SessionUser = {
  isAdmin?: boolean;
};

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.isAdmin = Boolean((user as SessionUser).isAdmin);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
    authorized() {
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
