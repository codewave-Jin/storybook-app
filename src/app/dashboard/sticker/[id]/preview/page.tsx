import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { StickerPreviewPayButton } from "@/components/StickerPreviewPayButton";
import { StickerPreviewSheet } from "@/components/StickerPreviewSheet";
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
  const previewSrc = order.previewImagePath;

  return (
    <DashboardShell title="스티커 미리보기">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-stone-500 underline-offset-4 hover:underline"
      >
        ← 대시보드로
      </Link>

      <div className="mx-auto mt-6 w-full max-w-xl">
        {previewSrc ? (
          <StickerPreviewSheet src={previewSrc} alt={`${order.phrase} 스티커 시트`} />
        ) : (
          <div className="flex aspect-[210/297] flex-col items-center justify-center rounded-2xl bg-white px-6 text-center shadow-sm ring-1 ring-stone-200">
            <p className="text-lg font-semibold text-stone-800">
              제작 준비 중입니다
            </p>
            <p className="mt-2 text-sm text-stone-500">
              A4 미리보기 시트가 완성되면 이 화면에 표시됩니다.
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
