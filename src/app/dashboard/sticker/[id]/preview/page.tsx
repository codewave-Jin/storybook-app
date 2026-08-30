import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { IntervalRefresher } from "@/components/IntervalRefresher";
import { StickerPreviewPayButton } from "@/components/StickerPreviewPayButton";
import { StickerPreviewViews } from "@/components/StickerPreviewViews";
import { enqueueStickerGeneration } from "@/lib/enqueue-sticker-generation";
import { prisma } from "@/lib/prisma";

export default async function StickerPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/sticker/${params.id}/preview`);
  }

  const order = await prisma.stickerOrder.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      character: true,
      template: true,
      sizeOption: true,
    },
  });

  if (!order) {
    notFound();
  }

  const paid = order.paymentStatus === "PAID";
  if (!order.previewImagePath) {
    void enqueueStickerGeneration(order.id);
  }
  const characterSrc =
    order.character.generatedImagePath ?? order.character.originalPhotoPath;
  const stickerSrc = order.previewImagePath ?? characterSrc;
  const overlayPhrase =
    !order.previewImagePath ||
    order.previewImagePath === order.character.generatedImagePath ||
    order.previewImagePath === order.character.originalPhotoPath;
  const waitingForGenerated = !order.previewImagePath;

  return (
    <DashboardShell title="스티커 미리보기">
      {waitingForGenerated ? (
        <IntervalRefresher
          active
          href={`/api/stickers/${order.id}/status`}
          initialSignature={order.previewImagePath ?? ""}
        />
      ) : null}
      <Link
        href="/dashboard"
        className="text-sm font-medium text-stone-500 underline-offset-4 hover:underline"
      >
        ← 대시보드로
      </Link>

      <div className="mx-auto mt-6 w-full max-w-xl">
        {stickerSrc ? (
          <StickerPreviewViews
            src={stickerSrc}
            phrase={order.phrase}
            quantity={order.quantity}
            overlayPhrase={overlayPhrase}
            showWatermark={!paid}
          />
        ) : (
          <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-stone-200">
            <p className="text-lg font-semibold text-stone-800">
              미리볼 이미지가 없습니다
            </p>
            <p className="mt-2 text-sm text-stone-500">
              캐릭터 생성이 끝난 뒤에 다시 열어 주세요.
            </p>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-stone-200">
          <p className="text-lg font-semibold">{order.phrase}</p>
          <p className="mt-1 text-sm text-stone-500">
            {order.character.label} · {order.template.label} · {order.sizeOption.label}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            A4 한 장에 {order.quantity}개
          </p>
        </div>

        <div className="mt-6">
          {paid ? (
            <div className="rounded-2xl bg-[#FDE8E0] px-5 py-8 text-center ring-1 ring-[#E07A5F]/20">
              <p className="text-lg font-semibold text-stone-800">
                결제가 완료되었어요
              </p>
              <p className="mt-2 text-sm text-[#E07A5F]">
                실제 스티커 파일을 준비하고 있습니다.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-sky-400 px-5 text-sm font-medium text-white"
              >
                대시보드로 돌아가기
              </Link>
            </div>
          ) : (
            <StickerPreviewPayButton orderId={order.id} />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
