import Link from "next/link";
import { notFound } from "next/navigation";
import { UpscaleWorkbench } from "@/components/admin/UpscaleWorkbench";
import { prisma } from "@/lib/prisma";

export default async function AdminUpscaleWorkPage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await prisma.storybookOrder.findUnique({
    where: { id: params.orderId },
    include: {
      user: true,
      template: true,
      illustrations: {
        where: { imagePath: { not: null } },
        orderBy: { pageNumber: "asc" },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="max-w-[1400px]">
      <Link
        href="/admin/upscale"
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← 업스케일 목록
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        일괄 업스케일
      </h1>
      <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div>
          <p className="text-sm text-stone-500">유저 이메일</p>
          <p className="mt-1 font-medium">{order.user.email}</p>
        </div>
        <div>
          <p className="text-sm text-stone-500">템플릿</p>
          <p className="mt-1 font-medium">{order.template.title}</p>
        </div>
      </div>

      {order.illustrations.length === 0 ? (
        <p className="mt-8 text-sm text-stone-500">
          원본 이미지가 있는 페이지가 없습니다.
        </p>
      ) : (
        <UpscaleWorkbench
          orderId={order.id}
          items={order.illustrations.map((item) => ({
            id: item.id,
            pageNumber: item.pageNumber,
            imagePath: item.imagePath as string,
            upscaledImagePath: item.upscaledImagePath,
          }))}
        />
      )}
    </div>
  );
}
