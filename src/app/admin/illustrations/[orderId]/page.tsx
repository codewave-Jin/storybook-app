import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addIllustrationPage,
  markOrderIllustrationsComplete,
} from "@/app/actions/illustrations";
import { CharacterZoomGrid } from "@/components/admin/CharacterZoomGrid";
import { IllustrationPageEditor } from "@/components/admin/IllustrationPageEditor";
import { IntervalRefresher } from "@/components/IntervalRefresher";
import {
  parseIdList,
  parseStringRecord,
  PRODUCTION_STATUS_LABEL,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { parseCustomFields } from "@/lib/templates";

export default async function AdminIllustrationWorkPage({
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
        orderBy: { pageNumber: "asc" },
      },
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
    .filter((character) => character !== undefined)
    .map((character) => ({
      id: character.id,
      label: character.label,
      gender: character.gender,
      imageSrc: character.generatedImagePath ?? character.originalPhotoPath,
    }));

  const customFields = parseCustomFields(order.template.customFields);
  const customValues = parseStringRecord(order.customInputValues);
  const waitingForGeneration = order.illustrations.some(
    (item) => item.status === "PROCESSING",
  );

  return (
    <div className="max-w-[1400px]">
      <IntervalRefresher active={waitingForGeneration} />
      <Link
        href="/admin/illustrations"
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← 삽화 작업 목록
      </Link>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">삽화 생성</h1>
          <p className="mt-1 text-sm text-stone-500">
            {PRODUCTION_STATUS_LABEL[order.productionStatus]} · 주문번호 {order.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/orders/${order.id}`}
            className="text-sm text-stone-500 hover:text-stone-800"
          >
            주문 상세
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-stone-500">유저 이메일</p>
            <p className="mt-1 font-medium">{order.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-stone-500">템플릿</p>
            <p className="mt-1 font-medium">{order.template.title}</p>
          </div>
          <div>
            <p className="text-sm text-stone-500">추가 입력값</p>
            {customFields.length === 0 ? (
              <p className="mt-1 text-sm text-stone-400">없음</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {customFields.map((field) => (
                  <li key={field.key}>
                    <span className="text-stone-500">{field.label}: </span>
                    <span className="font-medium">
                      {customValues[field.key] || "-"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-stone-600">
            선택된 캐릭터 · 클릭하면 확대됩니다
          </p>
          <CharacterZoomGrid characters={selectedCharacters} />
        </div>
      </section>

      <section className="mt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">페이지별 삽화</h2>
          <form action={addIllustrationPage.bind(null, order.id)}>
            <button
              type="submit"
              className="h-10 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white"
            >
              새 페이지 추가
            </button>
          </form>
        </div>

        {order.illustrations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <p className="font-medium">아직 페이지가 없습니다</p>
            <p className="mt-1 text-sm text-stone-500">
              새 페이지를 추가한 뒤 프롬프트를 작성해 주세요.
            </p>
          </div>
        ) : (
          order.illustrations.map((illustration) => (
            <IllustrationPageEditor
              key={illustration.id}
              characters={selectedCharacters}
              illustration={{
                id: illustration.id,
                pageNumber: illustration.pageNumber,
                prompt: illustration.prompt,
                imagePath: illustration.imagePath,
                status: illustration.status,
                selectedCharacterIds: parseIdList(
                  illustration.selectedCharacterIds,
                ),
              }}
            />
          ))
        )}
      </section>

      <div className="mt-10 border-t border-stone-200 pt-6">
        <form action={markOrderIllustrationsComplete.bind(null, order.id)}>
          <button
            type="submit"
            className="h-12 rounded-xl bg-stone-900 px-6 text-sm font-medium text-white"
          >
            전체 삽화 완료 처리
          </button>
        </form>
        <p className="mt-2 text-sm text-stone-400">
          완료 처리하면 제작상태가 업스케일중으로 바뀝니다.
        </p>
      </div>
    </div>
  );
}
