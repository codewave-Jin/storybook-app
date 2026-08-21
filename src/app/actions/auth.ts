"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AuthFormState = {
  error?: string;
} | undefined;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!email || !password || !name) {
    return { error: "모든 항목을 입력해 주세요." };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "올바른 이메일 주소를 입력해 주세요." };
  }

  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "이미 사용 중인 이메일입니다." };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      tokenBalance: {
        create: { balance: 0 },
      },
    },
  });

  redirect("/login?registered=1");
}

export async function authenticate(
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

    await signIn("credentials", {
      email,
      password,
      redirectTo: user?.isAdmin ? "/admin" : "/dashboard",
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
