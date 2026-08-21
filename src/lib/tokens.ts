import { prisma } from "@/lib/prisma";

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

export async function getOrCreateTodayFreeTokens(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.tokenBalance.findUnique({
      where: { userId },
    });

    if (!existing) {
      await tx.tokenBalance.create({
        data: {
          userId,
          balance: 3,
          lastFreeGrantDate: new Date(),
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          amount: 3,
          type: "DAILY_FREE",
        },
      });

      return;
    }

    if (isKoreaToday(existing.lastFreeGrantDate)) {
      return;
    }

    await tx.tokenBalance.update({
      where: { userId },
      data: {
        balance: { increment: 3 },
        lastFreeGrantDate: new Date(),
      },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: 3,
        type: "DAILY_FREE",
      },
    });
  });
}

export async function consumeToken(
  userId: string,
): Promise<{ success: boolean; message?: string }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.tokenBalance.findUnique({
      where: { userId },
    });

    if (!existing || existing.balance < 1) {
      return { success: false, message: "토큰이 부족합니다" };
    }

    await tx.tokenBalance.update({
      where: { userId },
      data: { balance: { decrement: 1 } },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: -1,
        type: "CHARACTER_GENERATION",
      },
    });

    return { success: true };
  });
}

export async function getCharacterCount(userId: string): Promise<number> {
  return prisma.character.count({
    where: { userId },
  });
}

export async function canCreateCharacter(
  userId: string,
): Promise<{ canCreate: boolean; current: number; limit: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { characterSlotLimit: true },
  });

  const limit = user?.characterSlotLimit ?? 5;
  const current = await getCharacterCount(userId);

  return {
    canCreate: current < limit,
    current,
    limit,
  };
}
