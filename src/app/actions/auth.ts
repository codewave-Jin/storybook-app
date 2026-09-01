"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AuthFormState = {
  error?: string;
} | undefined;

function safeCallbackPath(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return null;
  }

  return value;
}

function safeAdminCallbackPath(value: unknown) {
  const path = safeCallbackPath(value);
  if (!path) {
    return null;
  }
  if (path === "/admin/login" || path.startsWith("/admin/login/")) {
    return null;
  }
  if (path === "/admin" || path.startsWith("/admin/")) {
    return path;
  }
  return null;
}

function safeUserCallbackPath(value: unknown) {
  const path = safeCallbackPath(value);
  if (!path) {
    return null;
  }
  if (path === "/admin" || path.startsWith("/admin/")) {
    return null;
  }
  return path;
}

const TEST_USER_EMAIL = "test@codewave.im";

export async function authenticateAdmin(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해 주세요." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { isAdmin: true },
    });

    if (!user) {
      return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
    }

    const isTestUser = email === TEST_USER_EMAIL;
    if (!user.isAdmin && !isTestUser) {
      return { error: "관리자 또는 테스트 계정만 로그인할 수 있습니다." };
    }

    // Same browser: clear test-user session before admin credentials sign-in.
    await signOut({ redirect: false });

    await signIn("credentials", {
      email,
      password,
      redirectTo: user.isAdmin
        ? (safeAdminCallbackPath(formData.get("callbackUrl")) ?? "/admin")
        : (safeUserCallbackPath(formData.get("callbackUrl")) ?? "/dashboard"),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
      }
      return { error: "로그인에 실패했습니다. 다시 시도해 주세요." };
    }

    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

const SOCIAL_PROVIDERS = ["google", "kakao", "naver"] as const;

export async function signInWithProvider(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  if (!SOCIAL_PROVIDERS.includes(provider as (typeof SOCIAL_PROVIDERS)[number])) {
    redirect("/login?error=Configuration");
  }

  try {
    await signIn(provider, {
      redirectTo: safeCallbackPath(formData.get("callbackUrl")) ?? "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=${error.type}`);
    }
    throw error;
  }
}
