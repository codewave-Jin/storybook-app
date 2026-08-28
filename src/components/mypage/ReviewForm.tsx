"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createReview,
  updateReview,
  type ReviewFormState,
} from "@/app/actions/reviews";
import { AppImage } from "@/components/AppImage";
import { cn } from "@/lib/utils";
import {
  REVIEW_IMAGE_MAX_BYTES,
  REVIEW_IMAGE_TYPES,
  REVIEW_MAX_CONTENT,
  REVIEW_MAX_IMAGES,
  REVIEW_MIN_CONTENT,
} from "@/lib/reviews";

export type EligibleReviewOrder = {
  id: string;
  kind: "storybook" | "sticker";
  title: string;
};

export type ReviewFormImage = {
  id: string;
  url: string;
};

type LocalPhoto = {
  key: string;
  file: File;
  previewUrl: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center rounded-full bg-[#E07A5F] text-sm font-semibold text-white hover:bg-[#d56c51] disabled:opacity-60 sm:w-auto sm:px-7"
    >
      {pending ? "저장 중..." : label}
    </button>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        "h-8 w-8",
        filled ? "fill-[#E07A5F] stroke-[#E07A5F]" : "fill-none stroke-stone-300",
      )}
    >
      <path
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M12 3.5 14.7 9l6.05.88-4.38 4.27 1.03 6.02L12 17.27 6.6 20.17l1.03-6.02L3.25 9.88 9.3 9 12 3.5Z"
      />
    </svg>
  );
}

function RatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="mb-1.5 text-sm font-medium text-stone-700">별점</legend>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star}점`}
            onClick={() => onChange(star)}
            className="rounded-md p-0.5 outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#E07A5F]/40"
          >
            <StarIcon filled={star <= value} />
          </button>
        ))}
        <span className="ml-2 text-sm text-stone-500">{value}점</span>
      </div>
      <input type="hidden" name="rating" value={value} />
    </fieldset>
  );
}

function BusyOverlay() {
  const { pending } = useFormStatus();
  if (!pending) {
    return null;
  }
  return (
    <div
      className="absolute inset-0 z-10 rounded-[24px] bg-white/70"
      aria-busy
      aria-live="polite"
    />
  );
}

function PhotoDropzone({
  remainingSlots,
  disabled,
  onAddFiles,
}: {
  remainingSlots: number;
  disabled: boolean;
  onAddFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const canAdd = remainingSlots > 0 && !disabled;

  function handleFiles(fileList: FileList | null) {
    if (!fileList || !canAdd) {
      return;
    }
    onAddFiles(Array.from(fileList));
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        if (canAdd) {
          setDragActive(true);
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (canAdd) {
          setDragActive(true);
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget.contains(event.relatedTarget as Node)) {
          return;
        }
        setDragActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "mt-2 rounded-2xl border border-dashed px-4 py-6 text-center transition",
        dragActive
          ? "border-[#E07A5F] bg-[#FFF6F3]"
          : "border-stone-200 bg-[#FFF6F3]/60",
        !canAdd && "opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        disabled={!canAdd}
        onChange={(event) => handleFiles(event.target.files)}
      />
      <p className="text-sm font-medium text-stone-700">
        사진을 끌어다 놓거나 클릭해서 첨부하세요
      </p>
      <p className="mt-1 text-xs text-stone-500">
        최대 {REVIEW_MAX_IMAGES}장 · JPG, PNG, WEBP, GIF · 장당 4MB
      </p>
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#E07A5F] ring-1 ring-[#FDE8E0] hover:bg-[#FDE8E0] disabled:cursor-not-allowed"
      >
        {canAdd ? "사진 선택" : "더 이상 추가할 수 없어요"}
      </button>
    </div>
  );
}

export function ReviewForm({
  eligibleOrders,
  lockedOrder,
  review,
}: {
  eligibleOrders?: EligibleReviewOrder[];
  lockedOrder?: EligibleReviewOrder;
  review?: {
    id: string;
    rating: number;
    content: string;
    images?: ReviewFormImage[];
  };
}) {
  const isEdit = Boolean(review);
  const [state, formAction] = useFormState<ReviewFormState, FormData>(
    isEdit ? updateReview : createReview,
    undefined,
  );
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [content, setContent] = useState(review?.content ?? "");
  const [keptImages, setKeptImages] = useState<ReviewFormImage[]>(
    review?.images ?? [],
  );
  const [localPhotos, setLocalPhotos] = useState<LocalPhoto[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);

  const orders = lockedOrder ? [lockedOrder] : eligibleOrders ?? [];
  const defaultOrder = orders[0];
  const remainingSlots = REVIEW_MAX_IMAGES - keptImages.length - localPhotos.length;

  useEffect(() => {
    return () => {
      localPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke leftover object URLs on unmount
  }, []);

  const contentHint = useMemo(() => {
    if (content.trim().length < REVIEW_MIN_CONTENT) {
      return `${REVIEW_MIN_CONTENT}자 이상 작성해 주세요. (${content.trim().length}/${REVIEW_MAX_CONTENT})`;
    }
    return `${content.trim().length}/${REVIEW_MAX_CONTENT}`;
  }, [content]);

  function addFiles(files: File[]) {
    setClientError(null);
    const accepted: LocalPhoto[] = [];
    let nextCount = keptImages.length + localPhotos.length;

    for (const file of files) {
      if (nextCount >= REVIEW_MAX_IMAGES) {
        setClientError(`사진은 최대 ${REVIEW_MAX_IMAGES}장까지 첨부할 수 있습니다.`);
        break;
      }
      if (!REVIEW_IMAGE_TYPES.has(file.type)) {
        setClientError("JPG, PNG, WEBP, GIF 이미지만 첨부할 수 있습니다.");
        continue;
      }
      if (file.size > REVIEW_IMAGE_MAX_BYTES) {
        setClientError("각 사진은 4MB 이하여야 합니다.");
        continue;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
      nextCount += 1;
    }

    if (accepted.length > 0) {
      setLocalPhotos((current) => [...current, ...accepted]);
    }
  }

  function removeLocalPhoto(key: string) {
    setLocalPhotos((current) => {
      const target = current.find((photo) => photo.key === key);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((photo) => photo.key !== key);
    });
    setClientError(null);
  }

  function handleSubmit(formData: FormData) {
    setClientError(null);
    const trimmed = String(formData.get("content") ?? "").trim();
    if (trimmed.length < REVIEW_MIN_CONTENT) {
      setClientError(`리뷰는 ${REVIEW_MIN_CONTENT}자 이상 작성해 주세요.`);
      return;
    }
    for (const photo of localPhotos) {
      formData.append("images", photo.file);
    }
    formAction(formData);
  }

  if (!isEdit && orders.length === 0) {
    return (
      <p className="rounded-[24px] bg-white px-4 py-10 text-center text-sm text-stone-500 shadow-sm ring-1 ring-stone-200">
        배송이 완료된 주문이 있으면 리뷰를 남길 수 있어요.
      </p>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="relative rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-6"
    >
      <BusyOverlay />
      {isEdit ? (
        <input type="hidden" name="reviewId" value={review?.id} />
      ) : (
        <>
          <input type="hidden" name="orderKind" value={defaultOrder.kind} />
          {lockedOrder ? (
            <input type="hidden" name="orderId" value={lockedOrder.id} />
          ) : null}
        </>
      )}

      <p className="text-sm font-semibold text-stone-800">
        {isEdit ? "리뷰 수정" : "리뷰 작성"}
      </p>
      <p className="mt-1 text-xs text-stone-500">
        {lockedOrder?.title ?? "배송이 완료된 주문만 선택할 수 있습니다."}
      </p>

      {!isEdit && !lockedOrder ? (
        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium text-stone-700">주문</span>
          <select
            name="orderId"
            required
            defaultValue={defaultOrder.id}
            className="w-full rounded-xl border border-stone-200 bg-[#FFF6F3] px-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[#E07A5F]/30"
            onChange={(event) => {
              const selected = orders.find((order) => order.id === event.target.value);
              const kindInput = event.currentTarget.form?.elements.namedItem("orderKind");
              if (selected && kindInput instanceof HTMLInputElement) {
                kindInput.value = selected.kind;
              }
            }}
          >
            {orders.map((order) => (
              <option key={`${order.kind}-${order.id}`} value={order.id}>
                {order.kind === "storybook" ? "동화책" : "스티커"} · {order.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <RatingPicker value={rating} onChange={setRating} />

      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">
          리뷰 내용
        </span>
        <textarea
          name="content"
          required
          minLength={REVIEW_MIN_CONTENT}
          maxLength={REVIEW_MAX_CONTENT}
          rows={5}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="어떤 점이 좋았는지 적어 주세요"
          className="w-full resize-y rounded-xl border border-stone-200 bg-[#FFF6F3] px-3 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:bg-white focus:ring-2 focus:ring-[#E07A5F]/30"
        />
        <span className="mt-1.5 block text-xs text-stone-500">{contentHint}</span>
      </label>

      <div className="mt-4">
        <p className="text-sm font-medium text-stone-700">사진 첨부</p>
        <PhotoDropzone
          remainingSlots={remainingSlots}
          disabled={false}
          onAddFiles={addFiles}
        />

        {keptImages.length + localPhotos.length > 0 ? (
          <ul className="mt-3 grid grid-cols-5 gap-2">
            {keptImages.map((image) => (
              <li key={image.id} className="relative aspect-square">
                <input type="hidden" name="keepImageId" value={image.id} />
                <span className="relative block h-full overflow-hidden rounded-xl bg-[#FFF6F3] ring-1 ring-[#FDE8E0]">
                  <AppImage
                    src={image.url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setKeptImages((current) =>
                      current.filter((item) => item.id !== image.id),
                    )
                  }
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-xs text-white"
                  aria-label="사진 삭제"
                >
                  ×
                </button>
              </li>
            ))}
            {localPhotos.map((photo) => (
              <li key={photo.key} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewUrl}
                  alt=""
                  className="h-full w-full rounded-xl object-cover ring-1 ring-[#FDE8E0]"
                />
                <button
                  type="button"
                  onClick={() => removeLocalPhoto(photo.key)}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-xs text-white"
                  aria-label="사진 삭제"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {clientError || state?.error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {clientError ?? state?.error}
        </p>
      ) : null}

      <div className="mt-4">
        <SubmitButton label={isEdit ? "수정 저장" : "리뷰 등록"} />
      </div>
    </form>
  );
}
