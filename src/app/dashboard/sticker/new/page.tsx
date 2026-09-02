import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { StickerWizard } from "@/components/StickerWizard";
import { isStickerSizeSelectable } from "@/lib/templates";
import { prisma } from "@/lib/prisma";

export default async function NewStickerPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/sticker/new");
  }

  const [characters, borders, costumes, phrases, sizes] = await Promise.all([
    prisma.character.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stickerBorder.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.stickerCostume.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.stickerPhrasePreset.findMany({
      orderBy: { text: "asc" },
    }),
    prisma.stickerSizeOption.findMany({
      orderBy: { widthMm: "asc" },
    }),
  ]);

  return (
    <DashboardShell title="스티커 만들기">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-stone-500 underline-offset-4 hover:underline"
      >
        ← 대시보드로
      </Link>
      <div className="mt-4">
        <StickerWizard
          characters={characters.map((character) => ({
            id: character.id,
            label: character.label,
            gender: character.gender,
            status: character.status,
            generatedImagePath: character.generatedImagePath,
            originalPhotoPath: character.originalPhotoPath,
          }))}
          borders={borders.map((border) => ({
            id: border.id,
            label: border.label,
            thumbnailPath: border.thumbnailPath ?? border.imageUrl,
            category: border.category,
            sortOrder: border.sortOrder,
          }))}
          costumes={costumes.map((costume) => ({
            id: costume.id,
            label: costume.label,
            referenceImageUrl: costume.referenceImageUrl,
            sortOrder: costume.sortOrder,
          }))}
          phrases={phrases.map((phrase) => ({
            id: phrase.id,
            text: phrase.text,
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
      </div>
    </DashboardShell>
  );
}
