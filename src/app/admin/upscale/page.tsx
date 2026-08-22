import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/orders";

export default async function AdminUpscaleListPage() {
  const orders = await prisma.storybookOrder.findMany({
    where: {
      illustrations: {
        some: {
          imagePath: { not: null },
        },
      },
    },
    include: {
      user: { select: { email: true } },
      template: { select: { title: true } },
      illustrations: {
        select: {
          imagePath: true,
          upscaledImagePath: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">업스케일</h1>
      <p className="mt-1 text-sm text-stone-500">
        원본 이미지가 있는 주문을 업스케일합니다.
      </p>

      <div className="mt-6 space-y-3 md:hidden">
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white px-4 py-12 text-center text-sm text-stone-400">
            업스케일할 주문이 없습니다.
          </p>
        ) : (
          orders.map((order) => {
            const totalPages = order.illustrations.length;
            const generatedCount = order.illustrations.filter(
              (item) => item.imagePath,
            ).length;
            const upscaledCount = order.illustrations.filter(
              (item) => item.upscaledImagePath,
            ).length;

            return (
              <Link
                key={order.id}
                href={`/admin/upscale/${order.id}`}
                className="block rounded-2xl border border-stone-200 bg-white p-4"
              >
                <p className="break-all font-medium">{order.user.email}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {order.template.title}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {formatDateTime(order.createdAt)}
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  페이지 {totalPages} · 생성 {generatedCount} · 업스케일 {upscaledCount}
                </p>
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">주문일시</th>
              <th className="px-4 py-3 font-medium">유저 이메일</th>
              <th className="px-4 py-3 font-medium">템플릿명</th>
              <th className="px-4 py-3 font-medium">전체 페이지</th>
              <th className="px-4 py-3 font-medium">이미지 생성완료</th>
              <th className="px-4 py-3 font-medium">업스케일 완료</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-stone-400">
                  업스케일할 주문이 없습니다.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const totalPages = order.illustrations.length;
                const generatedCount = order.illustrations.filter(
                  (item) => item.imagePath,
                ).length;
                const upscaledCount = order.illustrations.filter(
                  (item) => item.upscaledImagePath,
                ).length;

                return (
                  <tr
                    key={order.id}
                    className="border-t border-stone-100 hover:bg-stone-50"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/upscale/${order.id}`} className="block">
                        {formatDateTime(order.createdAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/upscale/${order.id}`} className="block">
                        {order.user.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/upscale/${order.id}`} className="block">
                        {order.template.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/upscale/${order.id}`} className="block">
                        {totalPages}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/upscale/${order.id}`} className="block">
                        {generatedCount}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/upscale/${order.id}`} className="block">
                        {upscaledCount}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
