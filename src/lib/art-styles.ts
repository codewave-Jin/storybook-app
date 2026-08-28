import { prisma } from "@/lib/prisma";

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
    const selected = await prisma.artStyle.findUnique({
      where: { id: options.artStyleId },
    });
    if (selected?.referenceImageUrl) {
      return selected;
    }
  }

  const fallbackId = await resolveDefaultArtStyleId(options.templateId);
  if (!fallbackId) {
    return null;
  }

  return prisma.artStyle.findUnique({
    where: { id: fallbackId },
  });
}
