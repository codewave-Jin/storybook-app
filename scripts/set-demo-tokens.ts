import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "test@codewave.im" },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error("test@codewave.im 계정을 찾을 수 없습니다.");
  }

  const balance = await prisma.tokenBalance.upsert({
    where: { userId: user.id },
    update: { freeBalance: 0, paidBalance: 100 },
    create: {
      userId: user.id,
      freeBalance: 0,
      paidBalance: 100,
    },
  });

  console.log(
    `tokens set: ${user.email} free=${balance.freeBalance} paid=${balance.paidBalance}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
