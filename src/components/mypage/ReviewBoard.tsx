"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppImage } from "@/components/AppImage";
import { DeleteReviewButton } from "@/components/mypage/DeleteReviewButton";
import { cn } from "@/lib/utils";

export type WritableReviewCard = {
  id: string;
  kind: "storybook" | "sticker";
  title: string;
  thumbnail: string | null;
  completedAt: string;
};

export type WrittenReviewCard = {
  id: string;
  rating: number;
  content: string;
  title: string;
  images: string[];
  canEdit: boolean;
};

const TABS = [
  { id: "available", label: "작성 가능한 리뷰" },
  { id: "mine", label: "내가 쓴 리뷰" },
] as const;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[#E07A5F]" aria-label={`${rating}점`}>
      {"★".repeat(rating)}
      <span className="text-stone-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function ReviewBoard({
  writable,
  written,
}: {
  writable: WritableReviewCard[];
  written: WrittenReviewCard[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "mine" ? "mine" : "available";

  function setTab(next: "available" | "mine") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "available") {
      params.delete("tab");
    } else {
      params.set("tab", "mine");
    }
    const query = params.toString();
    router.replace(query ? `/mypage/reviews?${query}` : "/mypage/reviews");
  }

  return (
    <div>
      <div className="flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-stone-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "h-11 flex-1 rounded-xl text-sm font-semibold transition",
              tab === item.id
                ? "bg-[#E07A5F] text-white"
                : "text-stone-500 hover:bg-[#FFF6F3] hover:text-[#E07A5F]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "available" ? (
        writable.length === 0 ? (
          <p className="mt-5 rounded-[24px] bg-white px-4 py-12 text-center text-sm text-stone-500 shadow-sm ring-1 ring-stone-200">
            배송이 완료된 주문이 있으면 리뷰를 작성할 수 있어요.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {writable.map((order) => (
              <li
                key={`${order.kind}-${order.id}`}
                className="flex items-center gap-4 rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-5"
              >
                <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#FFF6F3] ring-1 ring-[#FDE8E0]">
                  {order.thumbnail ? (
                    <AppImage
                      src={order.thumbnail}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-[#E07A5F]">
                      {order.kind === "storybook" ? "책" : "스티커"}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-[#E07A5F]">
                    {order.kind === "storybook" ? "동화책" : "스티커"} · 배송완료
                  </p>
                  <p className="mt-0.5 truncate font-semibold text-stone-800">
                    {order.title}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    배송완료일 {order.completedAt}
                  </p>
                </div>
                <Link
                  href={`/mypage/reviews/write?kind=${order.kind}&orderId=${order.id}`}
                  className="inline-flex h-10 shrink-0 items-center rounded-full bg-[#E07A5F] px-4 text-sm font-semibold text-white hover:bg-[#d56c51]"
                >
                  리뷰 쓰기
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : written.length === 0 ? (
        <p className="mt-5 rounded-[24px] bg-white px-4 py-12 text-center text-sm text-stone-500 shadow-sm ring-1 ring-stone-200">
          아직 작성한 리뷰가 없습니다.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {written.map((review) => (
            <li
              key={review.id}
              className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Stars rating={review.rating} />
                  <p className="mt-1 truncate text-sm font-semibold text-stone-800">
                    {review.title}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {review.canEdit ? (
                    <Link
                      href={`/mypage/reviews/${review.id}/edit`}
                      className="inline-flex h-9 items-center rounded-full bg-[#FFF6F3] px-3 text-xs font-semibold text-[#E07A5F] ring-1 ring-[#FDE8E0] hover:bg-[#FDE8E0]"
                    >
                      수정
                    </Link>
                  ) : null}
                  <DeleteReviewButton reviewId={review.id} />
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600">
                {review.content}
              </p>
              {review.images.length > 0 ? (
                <ul className="mt-3 flex gap-2">
                  {review.images.slice(0, 4).map((src) => (
                    <li
                      key={src}
                      className="relative h-14 w-14 overflow-hidden rounded-xl bg-[#FFF6F3] ring-1 ring-[#FDE8E0]"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
