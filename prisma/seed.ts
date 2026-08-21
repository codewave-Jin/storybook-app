import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@storybook.app";
const DEMO_PASSWORD = "demo1234";
const ADMIN_EMAIL = "admin@codewave.im";
const ADMIN_PASSWORD = "1234";

const templates = [
  {
    title: "이빨아 반짝반짝",
    description: "양치질하는 습관을 재미있게 알려주는 생활습관 동화책",
    customFields: [],
  },
  {
    title: "동물 친구들",
    description: "좋아하는 동물과 함께 떠나는 즐거운 모험 동화책",
    customFields: [
      {
        key: "favoriteAnimal",
        label: "좋아하는 동물 이름",
        type: "text",
        placeholder: "예: 토끼, 강아지",
      },
    ],
  },
];

const dummyCharacters = [
  {
    label: "엄마",
    gender: "FEMALE" as const,
    originalPhotoPath: "/dummy/mom.svg",
    generatedImagePath: "/dummy/mom.svg",
    status: "COMPLETED" as const,
  },
  {
    label: "아빠",
    gender: "MALE" as const,
    originalPhotoPath: "/dummy/dad.svg",
    generatedImagePath: "/dummy/dad.svg",
    status: "COMPLETED" as const,
  },
  {
    label: "딸",
    gender: "FEMALE" as const,
    originalPhotoPath: "/dummy/daughter.svg",
    generatedImagePath: "/dummy/daughter.svg",
    status: "COMPLETED" as const,
  },
  {
    label: "아들",
    gender: "MALE" as const,
    originalPhotoPath: "/dummy/son.svg",
    generatedImagePath: null,
    status: "PENDING" as const,
  },
];

async function seedTemplates() {
  for (const template of templates) {
    const existing = await prisma.storybookTemplate.findFirst({
      where: { title: template.title },
    });

    if (existing) {
      await prisma.storybookTemplate.update({
        where: { id: existing.id },
        data: {
          description: template.description,
          customFields: template.customFields,
        },
      });
      continue;
    }

    await prisma.storybookTemplate.create({
      data: template,
    });
  }
}

async function seedCharactersForUser(userId: string) {
  for (const character of dummyCharacters) {
    const existing = await prisma.character.findFirst({
      where: {
        userId,
        originalPhotoPath: character.originalPhotoPath,
      },
    });

    if (existing) {
      await prisma.character.update({
        where: { id: existing.id },
        data: character,
      });
      continue;
    }

    await prisma.character.create({
      data: {
        userId,
        ...character,
      },
    });
  }
}

async function seedDemoUser() {
  const password = await hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: "데모",
      password,
    },
    create: {
      email: DEMO_EMAIL,
      password,
      name: "데모",
      tokenBalance: {
        create: { balance: 3 },
      },
    },
  });

  const tokenBalance = await prisma.tokenBalance.findUnique({
    where: { userId: user.id },
  });

  if (!tokenBalance) {
    await prisma.tokenBalance.create({
      data: {
        userId: user.id,
        balance: 3,
      },
    });
  }

  await seedCharactersForUser(user.id);
  return user.id;
}

async function seedAdminUser() {
  const password = await hash(ADMIN_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "관리자",
      password,
      isAdmin: true,
    },
    create: {
      email: ADMIN_EMAIL,
      password,
      name: "관리자",
      isAdmin: true,
      tokenBalance: {
        create: { balance: 0 },
      },
    },
  });

  const tokenBalance = await prisma.tokenBalance.findUnique({
    where: { userId: user.id },
  });

  if (!tokenBalance) {
    await prisma.tokenBalance.create({
      data: {
        userId: user.id,
        balance: 0,
      },
    });
  }
}

async function main() {
  await seedTemplates();
  await seedDemoUser();
  await seedAdminUser();

  const users = await prisma.user.findMany({
    where: { email: { notIn: [DEMO_EMAIL, ADMIN_EMAIL] } },
    select: { id: true },
  });

  for (const user of users) {
    const completedCount = await prisma.character.count({
      where: { userId: user.id, status: "COMPLETED" },
    });

    if (completedCount === 0) {
      await seedCharactersForUser(user.id);
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
