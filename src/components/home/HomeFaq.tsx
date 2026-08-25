"use client";

import { useState } from "react";

const FAQS = [
  {
    question: "몇 살부터 가능한가요?",
    answer:
      "아기부터 어른까지, 가족 모두 캐릭터로 만들 수 있어요. 특별한 나이 제한은 없습니다.",
  },
  {
    question: "사진 화질이 안 좋아도 괜찮나요?",
    answer:
      "정면을 바라보는 밝은 사진이면 충분해요. 완벽한 스튜디오 화질이 아니어도, 눈매·미소·헤어스타일이 보이면 사랑스러운 캐릭터로 담아 드려요.",
  },
  {
    question: "가족 여러 명이 함께 나올 수 있나요?",
    answer:
      "네. 한 권의 동화책에 가족 최대 3명까지 함께 등장할 수 있어요. 캐릭터는 최대 5명까지 만들어 두고, 책에 넣을 가족을 고르면 됩니다.",
  },
  {
    question: "완성까지 얼마나 걸리나요?",
    answer:
      "캐릭터는 사진을 올리면 바로 만들어져요. 동화책 제작 일정은 테마와 작업 상황에 따라 달라지며, 주문 후 진행 상태는 마이페이지에서 확인할 수 있어요.",
  },
];

export function HomeFaq() {
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
              <span className="text-sky-400">{open ? "–" : "+"}</span>
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
