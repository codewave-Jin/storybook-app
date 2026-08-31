import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import Naver from "next-auth/providers/naver";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function displayName(name: string | null | undefined, email: string) {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }
  return email.split("@")[0] || "사용자";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      authorization: {
        url: "https://kauth.kakao.com/oauth/authorize",
        params: { scope: "profile_nickname,account_email" },
      },
    }),
    Naver({
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
      checks: ["state"],
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(
          typeof credentials?.email === "string" ? credentials.email : "",
        );
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      const email = normalizeEmail(user.email);
      if (!email) {
        return "/login?error=OAuthEmailRequired";
      }

      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: displayName(user.name, email),
          password: null,
          tokenBalance: {
            create: { freeBalance: 0, paidBalance: 0 },
          },
        },
      });

      return true;
    },
    jwt: async ({ token, user, account }) => {
      if (account && account.provider !== "credentials" && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: normalizeEmail(user.email) },
          select: { id: true, isAdmin: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.isAdmin = dbUser.isAdmin;
        }
        return token;
      }

      if (user?.id) {
        token.sub = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isAdmin: true },
        });
        token.isAdmin = Boolean(dbUser?.isAdmin);
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
