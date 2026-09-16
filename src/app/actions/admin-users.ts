"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { grantPaidTokens, MAX_ADMIN_TOKEN_GRANT } from "@/lib/tokens";

export type GrantUserTokensState = {
  error?: string;
  success?: string;
} | undefined;

export async function grantUserTokens(
  _prevState: GrantUserTokensState,
  formData: FormData,
): Promise<GrantUserTokensState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  const amount = Number.parseInt(String(formData.get("amount") ?? ""), 10);

  if (!userId) {
    return { error: "회원을 선택해 주세요." };
  }

  if (!Number.isInteger(amount) || amount < 1) {
    return { error: "지급할 토큰 수를 입력해 주세요." };
  }

  if (amount > MAX_ADMIN_TOKEN_GRANT) {
    return { error: `한 번에 ${MAX_ADMIN_TOKEN_GRANT}개까지 지급할 수 있습니다.` };
  }

  try {
    await grantPaidTokens(userId, amount);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "토큰 지급에 실패했습니다.",
    };
  }

  revalidatePath("/admin/users");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/characters/new");

  return { success: `유료 토큰 ${amount}개를 지급했습니다.` };
}
