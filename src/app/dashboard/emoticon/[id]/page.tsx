import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { EmoticonResultPanel } from "@/components/EmoticonSheetPanel";
import { emoticonPreviewCells } from "@/lib/emoticon-generate";
import { prisma } from "@/lib/prisma";

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
    select: { id: true, paymentStatus: true, cellImagePaths: true },
  });
  if (!saved || saved.cellImagePaths.length === 0) {
    notFound();
  }

  return (
    <DashboardShell title="이모티콘 미리보기">
      <EmoticonResultPanel
        initialPreview={{
          orderId: saved.id,
          paid: saved.paymentStatus === "PAID",
          cells: emoticonPreviewCells(saved.cellImagePaths),
        }}
      />
    </DashboardShell>
  );
}
