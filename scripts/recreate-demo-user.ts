import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = await hash("1234", 10);
  const user = await prisma.user.upsert({
    where: { email: "test@codewave.im" },
    update: {
      name: "데모",
      password,
    },
    create: {
      email: "test@codewave.im",
      password,
      name: "데모",
      tokenBalance: {
        create: { freeBalance: 3, paidBalance: 0 },
      },
    },
  });

  await prisma.tokenBalance.upsert({
    where: { userId: user.id },
    update: { freeBalance: 3, paidBalance: 0 },
    create: {
      userId: user.id,
      freeBalance: 3,
      paidBalance: 0,
    },
  });

  console.log(`demo user ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
