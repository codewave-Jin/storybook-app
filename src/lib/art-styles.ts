import { prisma } from "@/lib/prisma";

/** 캐릭터 초상화를 다시 그리지 않고 삽화 레퍼런스로 그대로 쓴다. */
export const BASIC_ART_STYLE_KEY = "basic";

export function skipsStyleTransfer(
  artStyleKey: string | null | undefined,
): boolean {
  return artStyleKey === BASIC_ART_STYLE_KEY;
}

export async function artStyleSkipsStyleTransfer(
  artStyleId: string | null | undefined,
): Promise<boolean> {
  if (!artStyleId) {
    return false;
  }
  const style = await prisma.artStyle.findUnique({
    where: { id: artStyleId },
    select: { key: true },
  });
  return skipsStyleTransfer(style?.key);
}

export async function resolveDefaultArtStyleId(
  templateId: string,
): Promise<string | null> {
  const links = await prisma.templateArtStyle.findMany({
    where: {
      storybookTemplateId: templateId,
      artStyle: { isActive: true },
    },
    include: { artStyle: true },
    orderBy: { sortOrder: "asc" },
  });

  const withReference = links.filter(
    (link) => Boolean(link.artStyle.referenceImageUrl),
  );
  const watercolor = withReference.find(
    (link) => link.artStyle.key === "watercolor",
  );

  return (watercolor ?? withReference[0])?.artStyle.id ?? null;
}

export async function resolveOrderArtStyleId(options: {
  templateId: string;
  submittedArtStyleId: string | null;
}): Promise<{ artStyleId: string | null; error?: string }> {
  const submitted = options.submittedArtStyleId?.trim() ?? "";
  if (!submitted) {
    return { artStyleId: await resolveDefaultArtStyleId(options.templateId) };
  }

  const link = await prisma.templateArtStyle.findUnique({
    where: {
      storybookTemplateId_artStyleId: {
        storybookTemplateId: options.templateId,
        artStyleId: submitted,
      },
    },
    include: { artStyle: true },
  });

  if (!link || !link.artStyle.isActive || !link.artStyle.referenceImageUrl) {
    return {
      artStyleId: null,
      error: "이 동화책에서 지원하지 않는 그림체입니다.",
    };
  }

  return { artStyleId: submitted };
}

export async function resolveArtStyleForOrder(options: {
  artStyleId: string | null | undefined;
  templateId: string;
}) {
  if (options.artStyleId) {
    return prisma.artStyle.findUnique({
      where: { id: options.artStyleId },
    });
  }

  const fallbackId = await resolveDefaultArtStyleId(options.templateId);
  if (!fallbackId) {
    return null;
  }

  return prisma.artStyle.findUnique({
    where: { id: fallbackId },
  });
}
