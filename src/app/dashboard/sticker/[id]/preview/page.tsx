import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { GenerationProgress } from "@/components/GenerationProgress";
import { IntervalRefresher } from "@/components/IntervalRefresher";
import { StickerPreviewPayButton } from "@/components/StickerPreviewPayButton";
import { StickerPreviewViews } from "@/components/StickerPreviewViews";
import { enqueueStickerGeneration } from "@/lib/enqueue-sticker-generation";
import { stickerOrderExtraLabel, stickerOrderTitle } from "@/lib/templates";
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
      border: true,
      costume: true,
      sizeOption: true,
    },
  });

  if (!order) {
    notFound();
  }

  const paid = order.paymentStatus === "PAID";
  const generating =
    order.previewStatus === "IDLE" || order.previewStatus === "PROCESSING";
  const failed = order.previewStatus === "FAILED";
  const completed = order.previewStatus === "COMPLETED" && order.previewImagePath;

  if (order.previewStatus === "IDLE") {
    void enqueueStickerGeneration(order.id);
  }

  const stickerSrc = completed ? order.previewImagePath : null;

  return (
    <DashboardShell title="스티커 미리보기">
      {generating ? (
        <IntervalRefresher
          active
          href={`/api/stickers/${order.id}/status`}
          initialSignature={JSON.stringify({
            previewImagePath: order.previewImagePath,
            previewStatus: order.previewStatus,
            errorReason: order.errorReason,
          })}
        />
      ) : null}
      <Link
        href="/dashboard"
        className="text-sm font-medium text-stone-500 underline-offset-4 hover:underline"
      >
        ← 대시보드로
      </Link>

      <div className="mx-auto mt-6 w-full max-w-xl">
        {completed && stickerSrc ? (
          <StickerPreviewViews
            src={stickerSrc}
            phrase={order.phrase}
            quantity={order.quantity}
            overlayPhrase={false}
            showWatermark={!paid}
          />
        ) : failed ? (
          <div className="rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-stone-200">
            <p className="text-lg font-semibold text-stone-800">
              스티커 생성에 실패했어요
            </p>
            <p className="mt-2 text-sm text-stone-500">
              {order.errorReason ?? "잠시 후 다시 시도해 주세요."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-stone-200">
            <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-full bg-stone-100 ring-1 ring-stone-200">
              <GenerationProgress
                kind="sticker"
                id={order.id}
                startedAt={order.createdAt.getTime()}
              />
            </div>
            <p className="mt-6 text-lg font-semibold text-stone-800">
              스티커를 만들고 있어요
            </p>
            <p className="mt-2 text-sm text-stone-500">
              보통 1~3분 정도 걸려요. 끝나면 미리보기가 나타나요.
            </p>
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-stone-200">
          <p className="text-lg font-semibold">{order.phrase}</p>
          <p className="mt-1 text-sm text-stone-500">
            {stickerOrderTitle(
              order.character.label,
              stickerOrderExtraLabel(order),
            )}
            {order.customCostumeHint.trim()
              ? ` · ${order.customCostumeHint.trim()}`
              : order.costume
                ? ` · ${order.costume.label}`
                : ""}{" "}
            · {order.sizeOption.label}
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
          ) : completed ? (
            <StickerPreviewPayButton orderId={order.id} />
          ) : failed ? (
            <p className="text-center text-sm text-stone-500">
              생성이 끝나면 미리보기를 확인할 수 있어요.
            </p>
          ) : (
            <p className="text-center text-sm text-stone-500">
              미리보기를 만들고 있어요.
            </p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
