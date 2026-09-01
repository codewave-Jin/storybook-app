import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL = "test@codewave.im";
const DEMO_PASSWORD = "1234";
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

const STICKER_TEMPLATE_PUBLIC_BASE =
  "https://sflnuarzjushssbxpged.supabase.co/storage/v1/object/public/sticker-templates";

const FIRST_BIRTHDAY_TEMPLATE_KEY = "first-birthday";
const FIRST_BIRTHDAY_TEMPLATE_LABEL = "답례품";

const stickerTemplates = [
  {
    key: "basic",
    label: "스승의날",
    promptModifier: "keeping the original outfit",
    designReferenceImageUrl: null as string | null,
  },
  {
    key: "dinosaur",
    label: "어버이날",
    promptModifier: "wearing a cute dinosaur costume",
    designReferenceImageUrl: null as string | null,
  },
  {
    key: "crown",
    label: "일반 스티커",
    promptModifier: "wearing a royal outfit with a small crown",
    designReferenceImageUrl: null as string | null,
  },
  {
    key: FIRST_BIRTHDAY_TEMPLATE_KEY,
    label: FIRST_BIRTHDAY_TEMPLATE_LABEL,
    promptModifier:
      "first-birthday thank-you sticker, circular commemorative composition",
    designReferenceImageUrl: `${STICKER_TEMPLATE_PUBLIC_BASE}/birthday.png`,
  },
];

const defaultStickerCostumes = [
  {
    key: "none",
    label: "코스튬 없음 (원래 모습)",
    promptHint: "",
    sortOrder: 0,
    isActive: true,
  },
  {
    key: "butterfly",
    label: "나비 코스튬",
    promptHint: "나비 코스튬",
    sortOrder: 1,
    isActive: true,
  },
  {
    key: "formal",
    label: "정장",
    promptHint: "정장",
    sortOrder: 2,
    isActive: true,
  },
];

const stickerPhrasePresets = [
  "화이팅",
  "사랑해",
  "고마워",
  "안녕",
  "축하해",
  "첫번째 생일을 축하해주셔서 감사합니다 :)",
  "감사합니다",
  "첫돌을 축하해요",
];

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

const ART_STYLE_PUBLIC_BASE = "/art-styles";

const defaultArtStyles = [
  {
    key: "basic",
    label: "기본",
    referenceImageUrl: `${ART_STYLE_PUBLIC_BASE}/basic_style.png`,
    sortOrder: 0,
    isActive: true,
  },
  {
    key: "watercolor",
    label: "수채화",
    referenceImageUrl: `${ART_STYLE_PUBLIC_BASE}/watercolor_style.png`,
    sortOrder: 1,
    isActive: true,
  },
  {
    key: "crayon",
    label: "색연필",
    referenceImageUrl: `${ART_STYLE_PUBLIC_BASE}/colored-pencil_style.png`,
    sortOrder: 2,
    isActive: true,
  },
  {
    key: "flat-digital",
    label: "플랫 디지털",
    referenceImageUrl: `${ART_STYLE_PUBLIC_BASE}/flat-digital.png`,
    sortOrder: 3,
    isActive: true,
  },
  {
    key: "oil-painting",
    label: "유화",
    referenceImageUrl: `${ART_STYLE_PUBLIC_BASE}/oil-painting.png`,
    sortOrder: 4,
    isActive: true,
  },
];

const FOREST_TEMPLATE_TITLE = "숲속 친구들과의 하루";

const forestTemplateQuestions = [
  {
    key: "favorite_color",
    label: "좋아하는 색깔이 뭐예요?",
    answerType: "text",
    required: true,
    sortOrder: 1,
  },
  {
    key: "favorite_animal",
    label: "좋아하는 동물이 뭐예요?",
    answerType: "text",
    required: true,
    sortOrder: 2,
  },
  {
    key: "favorite_place",
    label: "가고 싶은 곳이 어디예요?",
    answerType: "text",
    required: false,
    sortOrder: 3,
  },
];

const forestPageTemplates: Array<{
  pageNumber: number;
  pageType: "COVER" | "PAGE";
  promptTemplate: string;
  characterSlots: number;
}> = [
  {
    pageNumber: 1,
    pageType: "COVER",
    characterSlots: 1,
    promptTemplate:
      "1번 캐릭터가 초록빛 숲 입구에 서서 손을 흔들고, 좋아하는 색깔 {{answer.favorite_color}} 풍선이 하늘로 떠오른다.",
  },
  {
    pageNumber: 2,
    pageType: "PAGE",
    characterSlots: 1,
    promptTemplate:
      "{{character_1}}가 아침 햇살이 들어오는 방에서 침대에 일어나 기지개를 켜고 있다.\n포인트 색깔은 {{answer.favorite_color}}이다.",
  },
  {
    pageNumber: 3,
    pageType: "PAGE",
    characterSlots: 1,
    promptTemplate:
      "{{character_1}}가 오두막을 나와 숲속 길을 산책하다가, 앞에서 {{answer.favorite_animal}}을(를) 만난다.",
  },
  {
    pageNumber: 4,
    pageType: "PAGE",
    characterSlots: 2,
    promptTemplate:
      "{{character_1}}이(가) 덤불 사이로 손을 내밀자 {{answer.favorite_animal}}이(가) 살며시 다가와, 함께 {{answer.favorite_color}} 꽃길을 걸어간다.",
  },
  {
    pageNumber: 5,
    pageType: "PAGE",
    characterSlots: 1,
    promptTemplate:
      "키 큰 나무 아래에서 {{character_1}}이(가) 이끼 방석에 앉아 도시락을 펼치고, {{answer.favorite_animal}}에게도 간식을 나눠 준다.",
  },
  {
    pageNumber: 6,
    pageType: "PAGE",
    characterSlots: 1,
    promptTemplate:
      "갑자기 바람이 불어 {{answer.favorite_color}} 나뭇잎이 흩날리고, {{character_1}}이(가) 신나게 뛰어다니며 잎사귀를 모아 둔다.",
  },
  {
    pageNumber: 7,
    pageType: "PAGE",
    characterSlots: 2,
    promptTemplate:
      "{{character_1}}과(와) {{character_2}}이(가) 통나무 다리를 조심조심 건너며, 건너편에 있을 {{answer.favorite_place}}를(을) 상상해 이야기한다.",
  },
  {
    pageNumber: 8,
    pageType: "PAGE",
    characterSlots: 1,
    promptTemplate:
      "반짝이는 반딧불이 {{answer.favorite_color}} 빛처럼 맴돌고, {{character_1}}이(가) 조용히 손을 모아 길을 밝힌다.",
  },
  {
    pageNumber: 9,
    pageType: "PAGE",
    characterSlots: 1,
    promptTemplate:
      "오래된 나무집 앞에서 {{character_1}}이(가) 문을 두드리자, 안에서 {{answer.favorite_animal}}이(가) 반가운 얼굴로 맞이한다.",
  },
  {
    pageNumber: 10,
    pageType: "PAGE",
    characterSlots: 2,
    promptTemplate:
      "{{character_1}}과(와) {{character_2}}이(가) 나무집 창가에 앉아, 언젠가 꼭 가 보고 싶은 {{answer.favorite_place}}에 대해 그림을 그린다.",
  },
  {
    pageNumber: 11,
    pageType: "PAGE",
    characterSlots: 1,
    promptTemplate:
      "저녁노을이 {{answer.favorite_color}}로 물든 언덕에서 {{character_1}}이(가) {{answer.favorite_animal}}과(와) 나란히 서서 멀리 {{answer.favorite_place}} 쪽 하늘을 바라본다.",
  },
  {
    pageNumber: 12,
    pageType: "PAGE",
    characterSlots: 1,
    promptTemplate:
      "집으로 돌아가는 길에 {{character_1}}이(가) 주운 {{answer.favorite_color}} 돌을 주머니에 넣고, 오늘 만난 숲속 친구들에게 작별 인사를 한다.",
  },
  {
    pageNumber: 13,
    pageType: "PAGE",
    characterSlots: 2,
    promptTemplate:
      "{{character_1}}과(와) {{character_2}}이(가) 손전등을 들고 밤길을 비추며, 내일은 {{answer.favorite_place}}로 떠나는 꿈을 속삭인다.",
  },
  {
    pageNumber: 14,
    pageType: "PAGE",
    characterSlots: 1,
    promptTemplate:
      "따뜻한 이불 속에서 {{character_1}}이(가) 미소 지으며 잠들고, 꿈속에 {{answer.favorite_animal}}과(와) 함께 {{answer.favorite_place}}를(을) 다시 거닌다.",
  },
];

type CustomFieldSeed = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
};

function parseCustomFieldSeed(value: unknown): CustomFieldSeed[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((field) => {
    if (
      !field ||
      typeof field !== "object" ||
      typeof (field as CustomFieldSeed).key !== "string" ||
      typeof (field as CustomFieldSeed).label !== "string" ||
      typeof (field as CustomFieldSeed).type !== "string"
    ) {
      return [];
    }

    const parsed = field as CustomFieldSeed;
    return [
      {
        key: parsed.key,
        label: parsed.label,
        type: parsed.type,
        placeholder:
          typeof parsed.placeholder === "string"
            ? parsed.placeholder
            : undefined,
        required:
          typeof parsed.required === "boolean" ? parsed.required : true,
      },
    ];
  });
}

async function syncTemplateQuestionsFromCustomFields(
  templateId: string,
  customFields: unknown,
) {
  const fields = parseCustomFieldSeed(customFields);

  for (const [index, field] of fields.entries()) {
    await prisma.templateQuestion.upsert({
      where: {
        storybookTemplateId_key: {
          storybookTemplateId: templateId,
          key: field.key,
        },
      },
      update: {
        label: field.label,
        answerType: field.type || "text",
        placeholder: field.placeholder ?? null,
        required: field.required !== false,
        sortOrder: index,
      },
      create: {
        storybookTemplateId: templateId,
        key: field.key,
        label: field.label,
        answerType: field.type || "text",
        placeholder: field.placeholder ?? null,
        required: field.required !== false,
        sortOrder: index,
      },
    });
  }
}

async function migrateLegacyArtStyleKeys() {
  const watercolor = await prisma.artStyle.findUnique({
    where: { key: "watercolor" },
  });
  const storybook = await prisma.artStyle.findUnique({
    where: { key: "storybook" },
  });
  const basic = await prisma.artStyle.findUnique({ where: { key: "basic" } });

  const watercolorIsActuallyBasic =
    Boolean(watercolor) &&
    !basic &&
    (watercolor?.label === "기본" ||
      watercolor?.referenceImageUrl?.includes("basic_style.png"));

  if (!watercolor || !watercolorIsActuallyBasic) {
    return;
  }

  await prisma.artStyle.update({
    where: { id: watercolor.id },
    data: { key: "__tmp_rename_basic__" },
  });
  if (storybook) {
    await prisma.artStyle.update({
      where: { id: storybook.id },
      data: { key: "watercolor" },
    });
  }
  await prisma.artStyle.update({
    where: { id: watercolor.id },
    data: { key: "basic" },
  });
}

async function seedArtStyles() {
  await migrateLegacyArtStyleKeys();
  const styles = [];

  for (const style of defaultArtStyles) {
    const row = await prisma.artStyle.upsert({
      where: { key: style.key },
      update: {
        label: style.label,
        referenceImageUrl: style.referenceImageUrl,
        sortOrder: style.sortOrder,
        isActive: style.isActive,
      },
      create: style,
    });
    styles.push(row);
  }

  await prisma.artStyle.updateMany({
    where: { key: { notIn: defaultArtStyles.map((style) => style.key) } },
    data: { isActive: false },
  });

  return styles;
}

async function linkArtStylesToTemplate(
  templateId: string,
  artStyles: Array<{ id: string; sortOrder: number }>,
) {
  for (const style of artStyles) {
    await prisma.templateArtStyle.upsert({
      where: {
        storybookTemplateId_artStyleId: {
          storybookTemplateId: templateId,
          artStyleId: style.id,
        },
      },
      update: { sortOrder: style.sortOrder },
      create: {
        storybookTemplateId: templateId,
        artStyleId: style.id,
        sortOrder: style.sortOrder,
      },
    });
  }
}

async function linkArtStylesToAllTemplates(
  artStyles: Array<{ id: string; sortOrder: number }>,
) {
  const storybookTemplates = await prisma.storybookTemplate.findMany({
    select: { id: true },
  });

  for (const template of storybookTemplates) {
    await linkArtStylesToTemplate(template.id, artStyles);
  }
}

async function seedForestFriendsTemplate(
  artStyles: Array<{ id: string; sortOrder: number }>,
) {
  const existing = await prisma.storybookTemplate.findFirst({
    where: { title: FOREST_TEMPLATE_TITLE },
  });

  const templateData = {
    title: FOREST_TEMPLATE_TITLE,
    description: "숲속 친구들과 하루를 보내며 좋아하는 색깔·동물·장소를 담는 테스트용 동화책",
    category: "FUN" as const,
    customFields: forestTemplateQuestions.map((q) => ({
      key: q.key,
      label: q.label,
      type: q.answerType,
      required: q.required,
    })),
    topicPresets: [],
  };

  const template = existing
    ? await prisma.storybookTemplate.update({
        where: { id: existing.id },
        data: templateData,
      })
    : await prisma.storybookTemplate.create({
        data: templateData,
      });

  for (const question of forestTemplateQuestions) {
    await prisma.templateQuestion.upsert({
      where: {
        storybookTemplateId_key: {
          storybookTemplateId: template.id,
          key: question.key,
        },
      },
      update: {
        label: question.label,
        answerType: question.answerType,
        required: question.required,
        sortOrder: question.sortOrder,
      },
      create: {
        storybookTemplateId: template.id,
        key: question.key,
        label: question.label,
        answerType: question.answerType,
        required: question.required,
        sortOrder: question.sortOrder,
      },
    });
  }

  for (const page of forestPageTemplates) {
    await prisma.pageTemplate.upsert({
      where: {
        storybookTemplateId_pageNumber: {
          storybookTemplateId: template.id,
          pageNumber: page.pageNumber,
        },
      },
      update: {
        pageType: page.pageType,
        promptTemplate: page.promptTemplate,
        characterSlots: page.characterSlots,
      },
      create: {
        storybookTemplateId: template.id,
        pageNumber: page.pageNumber,
        pageType: page.pageType,
        promptTemplate: page.promptTemplate,
        characterSlots: page.characterSlots,
      },
    });
  }

  await linkArtStylesToTemplate(template.id, artStyles);
  return template.id;
}

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
      await syncTemplateQuestionsFromCustomFields(
        existing.id,
        template.customFields,
      );
      continue;
    }

    const created = await prisma.storybookTemplate.create({
      data: template,
    });
    await syncTemplateQuestionsFromCustomFields(
      created.id,
      template.customFields,
    );
  }
}

async function seedStickerCostumes() {
  const costumes = [];

  for (const costume of defaultStickerCostumes) {
    const row = await prisma.stickerCostume.upsert({
      where: { key: costume.key },
      update: {
        label: costume.label,
        promptHint: costume.promptHint,
        sortOrder: costume.sortOrder,
        isActive: costume.isActive,
      },
      create: costume,
    });
    costumes.push(row);
  }

  return costumes;
}

async function linkCostumesToStickerTemplate(
  templateId: string,
  costumes: Array<{ id: string; sortOrder: number }>,
) {
  for (const costume of costumes) {
    await prisma.templateCostume.upsert({
      where: {
        stickerTemplateId_costumeId: {
          stickerTemplateId: templateId,
          costumeId: costume.id,
        },
      },
      update: { sortOrder: costume.sortOrder },
      create: {
        stickerTemplateId: templateId,
        costumeId: costume.id,
        sortOrder: costume.sortOrder,
      },
    });
  }
}

async function seedStickerCatalog() {
  for (const template of stickerTemplates) {
    await prisma.stickerTemplate.upsert({
      where: { key: template.key },
      update: {
        label: template.label,
        promptModifier: template.promptModifier,
        designReferenceImageUrl: template.designReferenceImageUrl,
      },
      create: template,
    });
  }

  const costumes = await seedStickerCostumes();
  const firstBirthday = await prisma.stickerTemplate.findUnique({
    where: { key: FIRST_BIRTHDAY_TEMPLATE_KEY },
  });
  if (firstBirthday) {
    await linkCostumesToStickerTemplate(firstBirthday.id, costumes);
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

async function removeDummyCharacters() {
  const dummyCharacters = await prisma.character.findMany({
    where: { originalPhotoPath: { startsWith: "/dummy/" } },
    select: { id: true },
  });
  const ids = dummyCharacters.map((character) => character.id);
  if (ids.length === 0) {
    return;
  }

  await prisma.review.deleteMany({
    where: { stickerOrder: { characterId: { in: ids } } },
  });
  await prisma.stickerOrder.deleteMany({
    where: { characterId: { in: ids } },
  });
  await prisma.character.deleteMany({
    where: { id: { in: ids } },
  });
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
  const artStyles = await seedArtStyles();
  await seedForestFriendsTemplate(artStyles);
  await linkArtStylesToAllTemplates(artStyles);
  await seedStickerCatalog();
  await seedDemoUser();
  await seedAdminUser();
  await removeDummyCharacters();

  // Backfill TemplateQuestion from any remaining legacy customFields.
  const allTemplates = await prisma.storybookTemplate.findMany({
    select: { id: true, customFields: true },
  });
  for (const template of allTemplates) {
    await syncTemplateQuestionsFromCustomFields(
      template.id,
      template.customFields,
    );
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
