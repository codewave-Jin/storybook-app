import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { EmoticonSheetPanel } from "@/components/EmoticonSheetPanel";
import { toClientCharacterImages } from "@/lib/media-paths";
import { prisma } from "@/lib/prisma";
import { getCharacterSlotAndTokens } from "@/lib/tokens";

export default async function EmoticonPage({
  searchParams,
}: {
  searchParams?: { order?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/emoticon");
  }
  if (searchParams?.order) {
    redirect(`/dashboard/emoticon/${searchParams.order}`);
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
    <DashboardShell compact title="이모티콘 만들기">
      <EmoticonSheetPanel
        characters={characters.flatMap((character) => {
          const image = toClientCharacterImages(character);
          if (!image.generatedImagePath) {
            return [];
          }
          return [
            {
              id: image.id,
              label: image.label,
              imageSrc: image.generatedImagePath,
            },
          ];
        })}
        tokenBalance={tokens}
      />
    </DashboardShell>
  );
}
