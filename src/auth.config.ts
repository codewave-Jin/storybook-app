import type { NextAuthConfig } from "next-auth";

type SessionUser = {
  isAdmin?: boolean;
};

function ensureCanonicalAuthUrl() {
  const raw = process.env.AUTH_URL?.trim();
  if (!raw) {
    return;
  }

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "panbagi.co.kr") {
      process.env.AUTH_URL = "https://www.panbagi.co.kr";
    }
  } catch {
    // Keep the original AUTH_URL if it is not a valid URL.
  }
}

ensureCanonicalAuthUrl();

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
