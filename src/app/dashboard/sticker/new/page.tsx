import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { StickerWizard } from "@/components/StickerWizard";
import { stickerBorderLabel, isStickerSizeSelectable } from "@/lib/templates";
import { prisma } from "@/lib/prisma";
import { toClientCharacterImages } from "@/lib/media-paths";
import { getCharacterSlotAndTokens } from "@/lib/tokens";

export default async function NewStickerPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/sticker/new");
  }

  const [{ tokens }, characters, borders, sizes] = await Promise.all([
    getCharacterSlotAndTokens(session.user.id),
    prisma.character.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stickerBorder.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.stickerSizeOption.findMany({
      orderBy: { widthMm: "asc" },
    }),
  ]);

  return (
    <DashboardShell compact title="스티커 만들기">
      <StickerWizard
        tokenBalance={tokens}
        defaultEmail={session.user.email ?? undefined}
        defaultName={session.user.name ?? undefined}
        characters={characters.map((character) => {
          const redacted = toClientCharacterImages(character);
          return {
            id: redacted.id,
            label: redacted.label,
            gender: redacted.gender,
            status: redacted.status,
            generatedImagePath: redacted.generatedImagePath,
            originalPhotoPath: redacted.originalPhotoPath,
          };
        })}
        borders={borders.map((border) => ({
          id: border.id,
          key: border.key,
          label: stickerBorderLabel(border.key, border.label),
          thumbnailPath: border.thumbnailPath ?? border.imageUrl,
          imageUrl: border.imageUrl,
          category: border.category,
          sortOrder: border.sortOrder,
        }))}
        sizes={sizes.map((size) => ({
          id: size.id,
          label: size.label,
          widthMm: size.widthMm,
          heightMm: size.heightMm,
          quantityPerA4: size.quantityPerA4,
          available: isStickerSizeSelectable(size.label),
        }))}
      />
    </DashboardShell>
  );
}
