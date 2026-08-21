import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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

const GENDER_LABEL = {
  MALE: "남자아이",
  FEMALE: "여자아이",
} as const;

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
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">주문 상세</h1>
      <p className="mt-1 text-xs text-stone-400">주문번호 {order.id}</p>

      <section className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h2 className="text-sm font-medium text-stone-500">유저 정보</h2>
          <p className="mt-2 font-medium">{order.user.name}</p>
          <p className="text-sm text-stone-500">{order.user.email}</p>
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
        <div className="mt-4 grid grid-cols-3 gap-4">
          {selectedCharacters.map((character) => {
            const imageSrc =
              character.generatedImagePath ?? character.originalPhotoPath;

            return (
              <article
                key={character.id}
                className="overflow-hidden rounded-xl border border-stone-200"
              >
                <div className="relative aspect-[4/5] bg-stone-100">
                  <Image
                    src={imageSrc}
                    alt={character.label}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
                <div className="p-3">
                  <p className="font-medium">{character.label}</p>
                  <p className="text-sm text-stone-500">
                    {GENDER_LABEL[character.gender]}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium text-stone-500">추가 입력값</h2>
        {customFields.length === 0 ? (
          <p className="mt-3 text-sm text-stone-400">입력된 추가 정보가 없습니다.</p>
        ) : (
          <dl className="mt-3 space-y-2">
            {customFields.map((field) => (
              <div key={field.key} className="flex gap-3 text-sm">
                <dt className="w-40 text-stone-500">{field.label}</dt>
                <dd className="font-medium">
                  {customValues[field.key] || "-"}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className="mt-8 flex items-center gap-3">
        <Link
          href={`/admin/illustrations/${order.id}`}
          className="inline-flex h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-medium text-white"
        >
          삽화 생성하러 가기
        </Link>
        <DeleteOrderButton orderId={order.id} redirectTo="/admin/orders" />
      </div>
    </div>
  );
}
