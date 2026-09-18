import { TokenTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SIGNUP_TOKEN_GRANT = 3;

export type TokenSpendSource = "free" | "paid";
export type TokenHoldKind = "STORYBOOK_PREVIEW" | "STICKER_SPECIAL";

function totalTokens(balance: {
  freeBalance: number;
  paidBalance: number;
}) {
  return balance.freeBalance + balance.paidBalance;
}

export async function grantSignupTokens(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.tokenBalance.findUnique({
      where: { userId },
    });
    if (existing) {
      return;
    }

    await tx.tokenBalance.create({
      data: {
        userId,
        freeBalance: SIGNUP_TOKEN_GRANT,
        paidBalance: 0,
      },
    });
    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: SIGNUP_TOKEN_GRANT,
        type: "SIGNUP_GRANT",
      },
    });
  });
}

export async function consumeToken(
  userId: string,
  type: TokenTransactionType = "STORYBOOK_PREVIEW",
): Promise<{
  success: boolean;
  message?: string;
  used?: TokenSpendSource;
}> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.tokenBalance.findUnique({
      where: { userId },
    });

    if (!existing || totalTokens(existing) < 1) {
      return { success: false, message: "토큰이 부족합니다" };
    }

    const used: TokenSpendSource =
      existing.freeBalance > 0 ? "free" : "paid";

    await tx.tokenBalance.update({
      where: { userId },
      data:
        used === "free"
          ? { freeBalance: { decrement: 1 } }
          : { paidBalance: { decrement: 1 } },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: -1,
        type,
      },
    });

    return { success: true, used };
  });
}

export async function consumeTokenHold(
  userId: string,
  kind: TokenHoldKind,
): Promise<{
  success: boolean;
  message?: string;
  holdId?: string;
}> {
  const type: TokenTransactionType =
    kind === "STICKER_SPECIAL" ? "STICKER_SPECIAL" : "STORYBOOK_PREVIEW";
  const consumed = await consumeToken(userId, type);
  if (!consumed.success || !consumed.used) {
    return { success: false, message: consumed.message ?? "토큰이 부족합니다" };
  }

  const hold = await prisma.tokenHold.create({
    data: {
      userId,
      kind,
      spendSource: consumed.used,
    },
    select: { id: true },
  });

  return { success: true, holdId: hold.id };
}

export async function attachTokenHoldToOrder(
  userId: string,
  holdId: string,
  orderId: string,
): Promise<boolean> {
  const updated = await prisma.tokenHold.updateMany({
    where: { id: holdId, userId, refunded: false },
    data: { orderId },
  });
  return updated.count > 0;
}

export async function refundToken(
  userId: string,
  used: TokenSpendSource,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.tokenBalance.update({
      where: { userId },
      data:
        used === "free"
          ? { freeBalance: { increment: 1 } }
          : { paidBalance: { increment: 1 } },
    });
    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: 1,
        type: "REFUND",
      },
    });
  });
}

export async function refundTokenHold(
  userId: string,
  holdId: string,
): Promise<boolean> {
  const hold = await prisma.tokenHold.findFirst({
    where: { id: holdId, userId, refunded: false },
    select: { id: true, spendSource: true },
  });
  if (!hold) {
    return false;
  }

  const used: TokenSpendSource = hold.spendSource === "paid" ? "paid" : "free";
  await prisma.$transaction(async (tx) => {
    const locked = await tx.tokenHold.findFirst({
      where: { id: hold.id, userId, refunded: false },
      select: { id: true },
    });
    if (!locked) {
      return;
    }
    await tx.tokenHold.update({
      where: { id: hold.id },
      data: { refunded: true },
    });
    await tx.tokenBalance.update({
      where: { userId },
      data:
        used === "free"
          ? { freeBalance: { increment: 1 } }
          : { paidBalance: { increment: 1 } },
    });
    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: 1,
        type: "REFUND",
      },
    });
  });
  return true;
}

export async function refundTokenHoldsForOrder(
  userId: string,
  kind: TokenHoldKind,
  orderId: string,
): Promise<void> {
  const holds = await prisma.tokenHold.findMany({
    where: { userId, kind, orderId, refunded: false },
    select: { id: true },
  });
  for (const hold of holds) {
    await refundTokenHold(userId, hold.id);
  }
}

export const MAX_ADMIN_TOKEN_GRANT = 1000;

export async function grantPaidTokens(userId: string, amount: number) {
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_ADMIN_TOKEN_GRANT) {
    throw new Error(`1~${MAX_ADMIN_TOKEN_GRANT}개 사이로 지급해 주세요.`);
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new Error("회원을 찾을 수 없습니다.");
    }

    const balance = await tx.tokenBalance.upsert({
      where: { userId },
      update: { paidBalance: { increment: amount } },
      create: {
        userId,
        freeBalance: 0,
        paidBalance: amount,
      },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        amount,
        type: "PURCHASE",
      },
    });

    return {
      freeBalance: balance.freeBalance,
      paidBalance: balance.paidBalance,
      total: totalTokens(balance),
    };
  });
}

export async function getCharacterSlotAndTokens(userId: string): Promise<{
  tokens: number;
  slot: { canCreate: boolean; current: number; limit: number };
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      characterSlotLimit: true,
      tokenBalance: {
        select: { freeBalance: true, paidBalance: true },
      },
      _count: {
        select: { characters: { where: { deletedAt: null } } },
      },
    },
  });

  const limit = user?.characterSlotLimit ?? 5;
  const current = user?._count.characters ?? 0;

  return {
    tokens: user?.tokenBalance ? totalTokens(user.tokenBalance) : 0,
    slot: {
      canCreate: current < limit,
      current,
      limit,
    },
  };
}

export async function getCharacterCount(userId: string): Promise<number> {
  return prisma.character.count({
    where: { userId, deletedAt: null },
  });
}

export async function canCreateCharacter(
  userId: string,
): Promise<{ canCreate: boolean; current: number; limit: number }> {
  const { slot } = await getCharacterSlotAndTokens(userId);
  return slot;
}
