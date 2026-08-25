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
    category: "EDUCATIONAL" as const,
    customFields: [],
    topicPresets: [
      {
        label: "목욕하기",
        emoji: "🛁",
        keywords: "목욕, 비누거품, 개운한 기분",
      },
      {
        label: "정리정돈",
        emoji: "🧸",
        keywords: "장난감 정리, 제자리, 깔끔한 방",
      },
      {
        label: "일찍 자기",
        emoji: "🌙",
        keywords: "잠자리, 자장가, 편안한 밤",
      },
    ],
  },
  {
    title: "동물 친구들",
    description: "좋아하는 동물과 함께 떠나는 즐거운 모험 동화책",
    category: "FUN" as const,
    customFields: [
      {
        key: "favoriteAnimal",
        label: "좋아하는 동물 이름",
        type: "text",
        placeholder: "예: 토끼, 강아지",
      },
    ],
    topicPresets: [
      {
        label: "동물원",
        emoji: "🦁",
        keywords: "동물원, 사자, 코끼리, 신나는 동물 친구들",
      },
      {
        label: "공룡",
        emoji: "🦕",
        keywords: "공룡, 화석 발굴, 용감한 탐험가",
      },
      {
        label: "바다 탐험",
        emoji: "🌊",
        keywords: "바다, 물고기, 산호초, 잠수함",
      },
      {
        label: "자동차",
        emoji: "🚗",
        keywords: "자동차, 신나는 드라이브, 여행",
      },
    ],
  },
  {
    title: "나는 미래에",
    description: "아이가 꿈꾸는 미래의 모습을 그려보는 상상 동화책",
    category: "DREAM_JOB" as const,
    customFields: [],
    topicPresets: [
      {
        label: "소방관",
        emoji: "🚒",
        keywords: "소방관, 용감한 구조, 불을 끄는 영웅",
      },
      {
        label: "우주비행사",
        emoji: "🚀",
        keywords: "우주비행사, 별과 행성, 우주선 탐험",
      },
      {
        label: "의사",
        emoji: "🩺",
        keywords: "의사, 아픈 친구 돌보기, 따뜻한 마음",
      },
      {
        label: "요리사",
        emoji: "👨‍🍳",
        keywords: "요리사, 맛있는 요리, 특별한 레스토랑",
      },
    ],
  },
];

const stickerTemplates = [
  {
    label: "기본",
    promptModifier: "keeping the original outfit",
  },
  {
    label: "공룡옷",
    promptModifier: "wearing a cute dinosaur costume",
  },
  {
    label: "왕관복",
    promptModifier: "wearing a royal outfit with a small crown",
  },
];

const stickerPhrasePresets = ["화이팅", "사랑해", "고마워", "안녕", "축하해"];

const stickerSizeOptions = [
  {
    label: "소형 (3cm)",
    widthMm: 30,
    heightMm: 30,
    quantityPerA4: 24,
  },
  {
    label: "중형 (5cm)",
    widthMm: 50,
    heightMm: 50,
    quantityPerA4: 12,
  },
  {
    label: "대형 (8cm)",
    widthMm: 80,
    heightMm: 80,
    quantityPerA4: 6,
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
          category: template.category,
          customFields: template.customFields,
          topicPresets: template.topicPresets,
        },
      });
      continue;
    }

    await prisma.storybookTemplate.create({
      data: template,
    });
  }
}

async function seedStickerCatalog() {
  for (const template of stickerTemplates) {
    const existing = await prisma.stickerTemplate.findFirst({
      where: { label: template.label },
    });

    if (existing) {
      await prisma.stickerTemplate.update({
        where: { id: existing.id },
        data: { promptModifier: template.promptModifier },
      });
      continue;
    }

    await prisma.stickerTemplate.create({ data: template });
  }

  for (const text of stickerPhrasePresets) {
    const existing = await prisma.stickerPhrasePreset.findFirst({
      where: { text },
    });

    if (!existing) {
      await prisma.stickerPhrasePreset.create({ data: { text } });
    }
  }

  for (const option of stickerSizeOptions) {
    const existing = await prisma.stickerSizeOption.findFirst({
      where: { label: option.label },
    });

    if (existing) {
      await prisma.stickerSizeOption.update({
        where: { id: existing.id },
        data: {
          widthMm: option.widthMm,
          heightMm: option.heightMm,
          quantityPerA4: option.quantityPerA4,
        },
      });
      continue;
    }

    await prisma.stickerSizeOption.create({ data: option });
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
        create: { freeBalance: 3, paidBalance: 0 },
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
        freeBalance: 3,
        paidBalance: 0,
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
        create: { freeBalance: 0, paidBalance: 0 },
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
        freeBalance: 0,
        paidBalance: 0,
      },
    });
  }
}

async function main() {
  await seedTemplates();
  await seedStickerCatalog();
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
