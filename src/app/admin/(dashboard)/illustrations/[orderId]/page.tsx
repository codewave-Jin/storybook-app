import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addIllustrationPage,
  markOrderIllustrationsComplete,
} from "@/app/actions/illustrations";
import { CharacterThumbnails } from "@/components/admin/CharacterZoomGrid";
import { AdminAllStoryCopyButton } from "@/components/admin/AdminStoryTextPanel";
import { IllustrationPageEditor } from "@/components/admin/IllustrationPageEditor";
import { IntervalRefresher } from "@/components/IntervalRefresher";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { illustrationStatusPayload } from "@/lib/generation-status";
import {
  parseIdList,
  parseStringRecord,
  PRODUCTION_STATUS_LABEL,
} from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import {
  buildOrderStoryPages,
  storyTextExportFromPages,
} from "@/lib/order-story-text";
import { parseIllustrationVersions } from "@/lib/illustration-versions";
import { parseCustomFields } from "@/lib/templates";
import {
  illustrationCharacterInputUrl,
  parseRegenInputChoice,
  parseRegenUploads,
} from "@/lib/character-regen-input";

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
  const assets = order.artStyleId
    ? await prisma.characterAsset.findMany({
        where: {
          characterId: { in: characterIds },
          artStyleId: order.artStyleId,
        },
        orderBy: { createdAt: "desc" },
        select: {
          characterId: true,
          rawPortraitUrl: true,
          styledImageUrl: true,
          regenInputUrl: true,
          regenInputChoice: true,
          regenUploads: true,
          status: true,
        },
      })
    : [];
  const assetByCharacterId = new Map<
    string,
    {
      rawPortraitUrl: string | null;
      styledImageUrl: string | null;
      regenInputUrl: string | null;
      regenInputChoice: string | null;
      regenUploads: unknown;
    }
  >();
  for (const asset of assets) {
    if (!assetByCharacterId.has(asset.characterId)) {
      assetByCharacterId.set(asset.characterId, asset);
    }
  }
  const selectedCharacters = characterIds
    .map((id) => characterMap.get(id))
    .filter((character) => character !== undefined)
    .map((character) => {
      const asset = assetByCharacterId.get(character.id);
      const originalSrc =
        character.generatedImagePath?.trim() ||
        asset?.rawPortraitUrl?.trim() ||
        character.originalPhotoPath;
      const styledSrc = asset?.styledImageUrl?.trim() || null;
      const regenOverrideSrc = asset?.regenInputUrl?.trim() || null;
      const regenUploads = parseRegenUploads(asset?.regenUploads);
      if (regenOverrideSrc && !regenUploads.includes(regenOverrideSrc)) {
        const isBuiltIn =
          regenOverrideSrc === originalSrc || regenOverrideSrc === styledSrc;
        if (!isBuiltIn) {
          regenUploads.push(regenOverrideSrc);
        }
      }
      const regenSrc = illustrationCharacterInputUrl(
        {
          styledImageUrl: styledSrc,
          regenInputUrl: regenOverrideSrc,
          regenInputChoice: parseRegenInputChoice(asset?.regenInputChoice),
        },
        originalSrc,
      );
      return {
        id: character.id,
        label: character.label,
        gender: character.gender,
        imageSrc: regenSrc || originalSrc || "",
        originalSrc,
        styledSrc,
        regenOverrideSrc,
        regenUploads,
        regenInputChoice: parseRegenInputChoice(asset?.regenInputChoice),
        regenSrc: regenSrc ?? undefined,
      };
    });

  const customFields = parseCustomFields(order.template.customFields);
  const customValues = parseStringRecord(order.customInputValues);
  const characterLabels = selectedCharacters.map((character) => character.label);
  const storyPages = buildOrderStoryPages({
    templateTitle: order.template.title,
    heroAgeRange: order.heroAgeRange,
    customInputValues: order.customInputValues,
    characterLabels,
    illustrations: order.illustrations,
  });
  const storyById = new Map(storyPages.map((page) => [page.id, page.text]));
  const waitingForGeneration = order.illustrations.some(
    (item) => item.status === "PROCESSING",
  );

  return (
    <div className="max-w-[1400px]">
      <IntervalRefresher
        active={waitingForGeneration}
        href={`/api/admin/orders/${order.id}/generation-status`}
        initialSignature={JSON.stringify(
          illustrationStatusPayload(order.illustrations),
        )}
      />
      <Link
        href="/admin/illustrations"
        className="text-sm text-stone-500 hover:text-stone-800"
      >
        ← 삽화 작업 목록
      </Link>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">삽화 생성</h1>
          <p className="mt-1 break-all text-sm text-stone-500">
            {PRODUCTION_STATUS_LABEL[order.productionStatus]} · 주문번호 {order.id}
          </p>
        </div>
        <Link
          href={`/admin/orders/${order.id}`}
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          주문 상세
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-stone-500">유저 이메일</p>
            <p className="mt-1 break-all font-medium">{order.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-stone-500">템플릿</p>
            <p className="mt-1 font-medium">{order.template.title}</p>
          </div>
          <div className="md:col-span-2">
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

        <div className="mt-4 border-t border-stone-100 pt-4">
          <p className="mb-2 text-xs font-medium text-stone-400">선택 캐릭터</p>
          <CharacterThumbnails characters={selectedCharacters} />
        </div>
      </section>

      <section className="mt-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold sm:text-xl">페이지별 삽화</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {storyTextExportFromPages(storyPages) ? (
              <>
                <AdminAllStoryCopyButton
                  pages={storyPages
                    .filter((page) => page.pageType !== "COVER")
                    .map((page) => ({ label: page.label, text: page.text }))}
                />
                <a
                  href={`/api/admin/orders/${order.id}/download-story-text`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50"
                >
                  본문 글 받기
                </a>
              </>
            ) : null}
            <a
              href={`/api/admin/orders/${order.id}/download-zip`}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-50"
            >
              삽화 받기
            </a>
            <form action={addIllustrationPage.bind(null, order.id)}>
              <PendingSubmitButton
                label="새 페이지 추가"
                pendingLabel="추가 중..."
                className="h-10 w-full rounded-xl bg-sky-400 px-4 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
              />
            </form>
          </div>
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
              orderId={order.id}
              characters={selectedCharacters}
              storyText={storyById.get(illustration.id) ?? ""}
              illustration={{
                id: illustration.id,
                pageNumber: illustration.pageNumber,
                prompt: illustration.prompt,
                imagePath: illustration.imagePath,
                sceneImagePath: illustration.sceneImagePath,
                imageVersions: parseIllustrationVersions(
                  illustration.imageVersions,
                ),
                status: illustration.status,
                selectedCharacterIds: parseIdList(
                  illustration.selectedCharacterIds,
                ),
                errorReason: illustration.errorReason,
                pageType: illustration.pageType,
              }}
            />
          ))
        )}
      </section>

      <div className="mt-10 border-t border-stone-200 pt-6">
        <form action={markOrderIllustrationsComplete.bind(null, order.id)}>
          <PendingSubmitButton
            label="전체 삽화 완료 처리"
            pendingLabel="처리 중..."
            className="h-12 w-full rounded-xl bg-sky-400 px-6 text-sm font-medium text-white disabled:opacity-60 sm:w-auto"
          />
        </form>
        <p className="mt-2 text-sm text-stone-400">
          완료 처리하면 제작상태가 업스케일중으로 바뀝니다.
        </p>
      </div>
    </div>
  );
}
