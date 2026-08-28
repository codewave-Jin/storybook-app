"use client";

import { useFormStatus } from "react-dom";
import { deleteReview } from "@/app/actions/reviews";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center rounded-full border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-500 hover:bg-stone-50 disabled:opacity-60"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  return (
    <form
      action={deleteReview}
      onSubmit={(event) => {
        if (!window.confirm("이 리뷰를 삭제할까요?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <DeleteButton />
    </form>
  );
}
