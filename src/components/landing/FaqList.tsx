"use client";

import { useState } from "react";

const FAQS = [
  {
    question: "판바기는 동화책만 만들어 주나요?",
    answer:
      "아니요. 핵심은 아이 사진으로 캐릭터를 만드는 일입니다. 그 캐릭터로 지금은 동화책을 만들 수 있고, 같은 캐릭터로 스티커·이모티콘·영상도 이어서 만들 예정이에요.",
  },
  {
    question: "사진을 꼭 넣어야 하나요?",
    answer:
      "네. 아이 얼굴을 기준으로 캐릭터를 그리기 때문에 정면 사진이 필요해요. 가족 캐릭터를 추가할 때도 사진이 있으면 더 닮게 나와요.",
  },
  {
    question: "캐릭터는 한 번만 쓰나요?",
    answer:
      "아니요. 한 번 만든 캐릭터는 여러 콘텐츠에 다시 쓸 수 있어요. 동화책을 새로 만들어도, 나중에 스티커나 영상이 열려도 같은 얼굴이 이어집니다.",
  },
  {
    question: "스티커, 이모티콘, 영상은 언제 나오나요?",
    answer:
      "지금은 캐릭터와 동화책부터 열고 있어요. 스티커·이모티콘·영상은 같은 캐릭터를 쓰는 다음 단계로 준비 중이며, 열리면 새로 캐릭터를 만들 필요 없이 이어집니다.",
  },
  {
    question: "동화책은 언제 받을 수 있나요?",
    answer:
      "PDF는 완성 후 바로 받을 수 있고, 하드커버 실물은 영업일 기준 5~7일 안에 배송됩니다. 인쇄가 시작되기 전이라면 전액 환불됩니다.",
  },
];

export function FaqList() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {FAQS.map((item, index) => {
        const open = openIndex === index;
        return (
          <div
            key={item.question}
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-stone-800"
              onClick={() => setOpenIndex(open ? null : index)}
              aria-expanded={open}
            >
              {item.question}
              <span className="text-stone-400">{open ? "–" : "+"}</span>
            </button>
            {open ? (
              <p className="border-t border-stone-100 px-5 py-4 text-sm leading-relaxed text-stone-600 sm:text-base">
                {item.answer}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
