import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { EmoticonResultPanel } from "@/components/EmoticonSheetPanel";
import { emoticonPreviewCells, emoticonThemeById } from "@/lib/emoticon-prompt";
import { prisma } from "@/lib/prisma";
import { getCharacterSlotAndTokens } from "@/lib/tokens";

export default async function EmoticonPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/emoticon/${params.id}`);
  }

  const saved = await prisma.emoticonOrder.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, paymentStatus: true, cellImagePaths: true, theme: true },
  });
  if (!saved || saved.cellImagePaths.length === 0) {
    notFound();
  }

  const { tokens } = await getCharacterSlotAndTokens(session.user.id);

  return (
    <DashboardShell title="이모티콘 미리보기">
      <EmoticonResultPanel
        initialPreview={{
          orderId: saved.id,
          paid: saved.paymentStatus === "PAID",
          themeLabel: emoticonThemeById(saved.theme).label,
          cells: emoticonPreviewCells(saved.cellImagePaths, saved.theme),
        }}
        tokenBalance={tokens}
      />
    </DashboardShell>
  );
}
