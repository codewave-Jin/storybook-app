import { prisma } from "@/lib/prisma";

const FREE_TOKEN_DAILY_MAX = 3;

export type TokenSpendSource = "free" | "paid";

function getKoreaDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isKoreaToday(date: Date | null | undefined): boolean {
  if (!date) {
    return false;
  }

  return getKoreaDateKey(date) === getKoreaDateKey();
}

function totalTokens(balance: {
  freeBalance: number;
  paidBalance: number;
}) {
  return balance.freeBalance + balance.paidBalance;
}

export async function getOrCreateTodayFreeTokens(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.tokenBalance.findUnique({
      where: { userId },
    });

    if (!existing) {
      await tx.tokenBalance.create({
        data: {
          userId,
          freeBalance: FREE_TOKEN_DAILY_MAX,
          paidBalance: 0,
          lastFreeGrantDate: new Date(),
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          amount: FREE_TOKEN_DAILY_MAX,
          type: "DAILY_FREE",
        },
      });

      return;
    }

    if (isKoreaToday(existing.lastFreeGrantDate)) {
      return;
    }

    const grantAmount = Math.max(
      0,
      FREE_TOKEN_DAILY_MAX - existing.freeBalance,
    );

    await tx.tokenBalance.update({
      where: { userId },
      data: {
        ...(grantAmount > 0
          ? { freeBalance: { increment: grantAmount } }
          : {}),
        lastFreeGrantDate: new Date(),
      },
    });

    if (grantAmount === 0) {
      return;
    }

    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: grantAmount,
        type: "DAILY_FREE",
      },
    });
  });
}

export async function consumeToken(userId: string): Promise<{
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
        type: "CHARACTER_GENERATION",
      },
    });

    return { success: true, used };
  });
}

export async function refundToken(
  userId: string,
  used: TokenSpendSource,
): Promise<void> {
  await prisma.tokenBalance.update({
    where: { userId },
    data:
      used === "free"
        ? { freeBalance: { increment: 1 } }
        : { paidBalance: { increment: 1 } },
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
      _count: { select: { characters: true } },
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
    where: { userId },
  });
}

export async function canCreateCharacter(
  userId: string,
): Promise<{ canCreate: boolean; current: number; limit: number }> {
  const { slot } = await getCharacterSlotAndTokens(userId);
  return slot;
}
