import type { NextAuthConfig } from "next-auth";

type SessionUser = {
  isAdmin?: boolean;
};

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
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
    authorized({ auth, request: { nextUrl } }) {
      if (!nextUrl.pathname.startsWith("/admin")) {
        return true;
      }

      return Boolean(auth?.user);
    },
  },
  providers: [],
} satisfies NextAuthConfig;
