import Link from "next/link";
import { notFound } from "next/navigation";
import { CharacterThumbnails } from "@/components/admin/CharacterZoomGrid";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { ProductionStatusSelect } from "@/components/admin/ProductionStatusSelect";
import {
  formatDateTime,
  PAYMENT_STATUS_LABEL,
  parseIdList,
  parseStringRecord,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { parseCustomFields } from "@/lib/templates";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.storybookOrder.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      template: true,
    },
  });

  if (!order) {
    notFound();
  }

  const characterIds = parseIdList(order.selectedCharacterIds);
  const characters = characterIds.length
    ? await prisma.character.findMany({
        where: { id: { in: characterIds } },
      })
    : [];
  const characterMap = new Map(
    characters.map((character) => [character.id, character]),
  );
  const selectedCharacters = characterIds
    .map((id) => characterMap.get(id))
    .filter((character) => character !== undefined);

  const customFields = parseCustomFields(order.template.customFields);
  const customValues = parseStringRecord(order.customInputValues);

  return (
    <div className="max-w-4xl">
      <Link
        href="/admin/orders"
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← 주문 목록
      </Link>
      <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
        주문 상세
      </h1>
      <p className="mt-1 break-all text-xs text-stone-400">주문번호 {order.id}</p>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-medium text-stone-500">유저 정보</h2>
          <p className="mt-2 font-medium">{order.user.name}</p>
          <p className="break-all text-sm text-stone-500">{order.user.email}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-medium text-stone-500">주문 정보</h2>
          <p className="mt-2 font-medium">{order.template.title}</p>
          <p className="text-sm text-stone-500">
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-medium text-stone-500">결제상태</h2>
          <p className="mt-2 font-medium">
            {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-medium text-stone-500">제작상태</h2>
          <div className="mt-3">
            <ProductionStatusSelect
              orderId={order.id}
              value={order.productionStatus}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-500">선택된 캐릭터</h2>
        <div className="mt-4">
          <CharacterThumbnails
            characters={selectedCharacters.map((character) => ({
              id: character.id,
              label: character.label,
              gender: character.gender,
              imageSrc:
                character.generatedImagePath ?? character.originalPhotoPath,
            }))}
          />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-500">추가 입력값</h2>
        {customFields.length === 0 ? (
          <p className="mt-3 text-sm text-stone-400">입력된 추가 정보가 없습니다.</p>
        ) : (
          <dl className="mt-3 space-y-2">
            {customFields.map((field) => (
              <div
                key={field.key}
                className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-3"
              >
                <dt className="w-auto text-stone-500 sm:w-40">{field.label}</dt>
                <dd className="font-medium">
                  {customValues[field.key] || "-"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={`/admin/illustrations/${order.id}`}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-medium text-white"
        >
          삽화 생성하러 가기
        </Link>
        <DeleteOrderButton orderId={order.id} redirectTo="/admin/orders" />
      </div>
    </div>
  );
}
