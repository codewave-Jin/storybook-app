import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { WordbookCreatePanel } from "@/components/WordbookPanel";
import { toClientCharacterImages } from "@/lib/media-paths";
import { prisma } from "@/lib/prisma";
import { getCharacterSlotAndTokens } from "@/lib/tokens";

export default async function WordbookPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/wordbook");
  }

  const characters = await prisma.character.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
      status: "COMPLETED",
      generatedImagePath: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, generatedImagePath: true, originalPhotoPath: true },
  });

  const { tokens } = await getCharacterSlotAndTokens(session.user.id);

  return (
    <DashboardShell compact title="단어 그림책 만들기">
      <WordbookCreatePanel
        characters={characters.flatMap((character) => {
          const image = toClientCharacterImages(character);
          if (!image.generatedImagePath) {
            return [];
          }
          return [{ id: image.id, label: image.label, imageSrc: image.generatedImagePath }];
        })}
        tokenBalance={tokens}
      />
    </DashboardShell>
  );
}
