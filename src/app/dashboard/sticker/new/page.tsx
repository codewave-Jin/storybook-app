import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { StickerWizard } from "@/components/StickerWizard";
import {
  isStickerTemplateSelectable,
  stickerTemplateLabel,
} from "@/lib/templates";
import { prisma } from "@/lib/prisma";

export default async function NewStickerPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/sticker/new");
  }

  const [characters, templates, phrases, sizes] = await Promise.all([
    prisma.character.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.stickerTemplate.findMany({
      orderBy: { createdAt: "asc" },
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
          templates={templates
            .map((template) => ({
              id: template.id,
              label: stickerTemplateLabel(template.key, template.label),
              thumbnailPath: template.thumbnailPath,
              available: isStickerTemplateSelectable(template.key),
            }))
            .sort((left, right) => Number(right.available) - Number(left.available))}
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
          }))}
        />
      </div>
    </DashboardShell>
  );
}
