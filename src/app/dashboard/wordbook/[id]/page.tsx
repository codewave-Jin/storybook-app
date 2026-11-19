import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { IntervalRefresher } from "@/components/IntervalRefresher";
import { WordbookResultPanel } from "@/components/WordbookPanel";
import { WORDBOOK_FREE_REGEN } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { getCharacterSlotAndTokens } from "@/lib/tokens";
import { expireStaleWordbookOrder, wordbookStatusPayload } from "@/lib/wordbook-generate";

export const dynamic = "force-dynamic";

export default async function WordbookOrderPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/wordbook/${params.id}`);
  }

  const order = await prisma.wordbookOrder.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: {
      id: true,
      userId: true,
      status: true,
      updatedAt: true,
      paymentStatus: true,
      baseImagePath: true,
      curiousImagePath: true,
      surprisedImagePath: true,
      curiousRegenCount: true,
      surprisedRegenCount: true,
      character: { select: { label: true } },
    },
  });
  if (!order) {
    notFound();
  }

  const expired = await expireStaleWordbookOrder(order);
  const status = expired ? "FAILED" : order.status;
  const { tokens } = await getCharacterSlotAndTokens(session.user.id);

  return (
    <DashboardShell title="단어 그림책 만들기">
      <IntervalRefresher
        active={status === "GENERATING"}
        href={`/api/wordbooks/${order.id}/status`}
        initialSignature={JSON.stringify(wordbookStatusPayload({ ...order, status }))}
      />
      <WordbookResultPanel
        order={{
          id: order.id,
          characterLabel: order.character?.label ?? "우리 아이",
          status,
          paid: order.paymentStatus === "PAID",
          baseImage: order.baseImagePath,
          curiousImage: order.curiousImagePath,
          surprisedImage: order.surprisedImagePath,
          curiousRegenLeft: Math.max(0, WORDBOOK_FREE_REGEN - order.curiousRegenCount),
          surprisedRegenLeft: Math.max(0, WORDBOOK_FREE_REGEN - order.surprisedRegenCount),
        }}
        tokenBalance={tokens}
      />
    </DashboardShell>
  );
}
