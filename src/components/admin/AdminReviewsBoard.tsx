"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppImage } from "@/components/AppImage";
import { setReviewsLandingVisible } from "@/app/actions/admin-reviews";
import { formatDateTime } from "@/lib/orders";
import { cn } from "@/lib/utils";

export type AdminReviewRow = {
  id: string;
  userName: string;
  userEmail: string;
  productTitle: string;
  rating: number;
  content: string;
  images: string[];
  isFeatured: boolean;
  createdAt: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating}점`}>
      {"★".repeat(rating)}
      <span className="text-stone-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function AdminReviewsBoard({ reviews }: { reviews: AdminReviewRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = reviews.length > 0 && selected.length === reviews.length;

  function toggleOne(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleAll() {
    setSelected(allSelected ? [] : reviews.map((review) => review.id));
  }

  function applyVisibility(ids: string[], visible: boolean) {
    if (ids.length === 0) {
      setError("리뷰를 선택해 주세요.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await setReviewsLandingVisible(ids, visible);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <p className="text-sm text-stone-500">
          {selected.length}개 선택됨
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => applyVisibility(selected, true)}
            className="h-9 rounded-lg bg-sky-400 px-3 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {isPending ? "처리 중..." : "선택한 리뷰 노출"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => applyVisibility(selected, false)}
            className="h-9 rounded-lg border border-stone-300 px-3 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-60"
          >
            노출 해제
          </button>
        </div>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-3 space-y-3 md:hidden">
        {reviews.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white px-4 py-12 text-center text-sm text-stone-400">
            등록된 리뷰가 없습니다.
          </p>
        ) : (
          reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedSet.has(review.id)}
                  onChange={() => toggleOne(review.id)}
                  className="mt-1 h-4 w-4 accent-sky-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{review.userName}</p>
                    {review.isFeatured ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                        노출중
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 break-all text-xs text-stone-400">
                    {review.userEmail}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">{review.productTitle}</p>
                  <Stars rating={review.rating} />
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">
                    {review.content}
                  </p>
                  {review.images.length > 0 ? (
                    <ul className="mt-3 flex gap-2">
                      {review.images.slice(0, 4).map((src) => (
                        <li
                          key={src}
                          className="relative h-14 w-14 overflow-hidden rounded-xl bg-stone-100"
                        >
                          <AppImage
                            src={src}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-2 text-xs text-stone-400">
                    {formatDateTime(new Date(review.createdAt))}
                  </p>
                </div>
              </label>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    applyVisibility([review.id], !review.isFeatured)
                  }
                  className={cn(
                    "h-9 rounded-lg px-3 text-sm font-medium disabled:opacity-60",
                    review.isFeatured
                      ? "border border-stone-300 text-stone-600 hover:bg-stone-50"
                      : "bg-sky-400 text-white hover:bg-sky-500",
                  )}
                >
                  {review.isFeatured ? "노출 해제" : "노출"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="전체 선택"
                  className="h-4 w-4 accent-sky-500"
                />
              </th>
              <th className="px-4 py-3 font-medium">작성자</th>
              <th className="px-4 py-3 font-medium">상품</th>
              <th className="px-4 py-3 font-medium">별점</th>
              <th className="px-4 py-3 font-medium">내용</th>
              <th className="px-4 py-3 font-medium">사진</th>
              <th className="px-4 py-3 font-medium">작성일</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-stone-400">
                  등록된 리뷰가 없습니다.
                </td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr key={review.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(review.id)}
                      onChange={() => toggleOne(review.id)}
                      className="h-4 w-4 accent-sky-500"
                    />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium">{review.userName}</p>
                    <p className="break-all text-xs text-stone-400">
                      {review.userEmail}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top text-stone-600">
                    {review.productTitle}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Stars rating={review.rating} />
                  </td>
                  <td className="max-w-xs px-4 py-3 align-top text-stone-700">
                    <p className="line-clamp-3 whitespace-pre-wrap">
                      {review.content}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {review.images.length > 0 ? (
                      <ul className="flex gap-1">
                        {review.images.slice(0, 3).map((src) => (
                          <li
                            key={src}
                            className="relative h-12 w-12 overflow-hidden rounded-lg bg-stone-100"
                          >
                            <AppImage
                              src={src}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-stone-400">없음</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap text-stone-500">
                    {formatDateTime(new Date(review.createdAt))}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {review.isFeatured ? (
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                        노출중
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400">미노출</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        applyVisibility([review.id], !review.isFeatured)
                      }
                      className={cn(
                        "h-9 rounded-lg px-3 text-sm font-medium disabled:opacity-60",
                        review.isFeatured
                          ? "border border-stone-300 text-stone-600 hover:bg-stone-50"
                          : "bg-sky-400 text-white hover:bg-sky-500",
                      )}
                    >
                      {review.isFeatured ? "노출 해제" : "노출"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
