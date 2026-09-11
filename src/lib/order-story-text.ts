import { buildOrderPromptVariables } from "@/lib/illustration-prompt";
import { parseIdList, parseStringRecord } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import {
  formatStoryTextExport,
  resolveFinalStoryText,
  resolveStoryCopyText,
  storyPageLabel,
} from "@/lib/storybook-copy";
import { isBirthdayStorybookTitle } from "@/lib/templates";

export type OrderStoryPage = {
  id: string;
  pageNumber: number;
  pageType: string;
  label: string;
  text: string;
  imagePath: string | null;
  sceneImagePath: string | null;
};

export function buildOrderStoryPages(options: {
  templateTitle: string;
  heroAgeRange?: string | null;
  customInputValues: unknown;
  characterLabels: string[];
  illustrations: Array<{
    id: string;
    pageNumber: number;
    pageType: string;
    storyText?: string | null;
    imagePath?: string | null;
    sceneImagePath?: string | null;
  }>;
}): OrderStoryPage[] {
  const enabled = isBirthdayStorybookTitle(options.templateTitle);
  const variables = buildOrderPromptVariables({
    characterLabels: options.characterLabels,
    customInputValues: parseStringRecord(options.customInputValues),
  });

  return options.illustrations.map((illustration) => {
    const fallback = enabled
      ? resolveStoryCopyText({
          pageNumber: illustration.pageNumber,
          pageType: illustration.pageType,
          ageKey: options.heroAgeRange,
          hasExtra: options.characterLabels.length > 1,
          variables,
        })
      : "";

    return {
      id: illustration.id,
      pageNumber: illustration.pageNumber,
      pageType: illustration.pageType,
      label: storyPageLabel(illustration),
      text: resolveFinalStoryText(illustration.storyText, fallback),
      imagePath: illustration.imagePath ?? null,
      sceneImagePath: illustration.sceneImagePath ?? null,
    };
  });
}

export function storyTextExportFromPages(pages: OrderStoryPage[]) {
  return formatStoryTextExport(
    pages.filter(
      (page) => page.pageType !== "COVER" && page.pageNumber > 1 && page.text,
    ),
  );
}

export async function loadOrderStoryPages(orderId: string) {
  const order = await prisma.storybookOrder.findUnique({
    where: { id: orderId },
    include: {
      template: { select: { title: true } },
      illustrations: {
        orderBy: { pageNumber: "asc" },
        select: {
          id: true,
          pageNumber: true,
          pageType: true,
          storyText: true,
          imagePath: true,
          sceneImagePath: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const characterIds = parseIdList(order.selectedCharacterIds);
  const characters = characterIds.length
    ? await prisma.character.findMany({
        where: { id: { in: characterIds } },
        select: { id: true, label: true },
      })
    : [];
  const characterLabels = characterIds
    .map((id) => characters.find((character) => character.id === id)?.label)
    .filter((label): label is string => Boolean(label));

  const pages = buildOrderStoryPages({
    templateTitle: order.template.title,
    heroAgeRange: order.heroAgeRange,
    customInputValues: order.customInputValues,
    characterLabels,
    illustrations: order.illustrations,
  });

  return {
    orderId: order.id,
    pages,
    exportText: storyTextExportFromPages(pages),
  };
}
