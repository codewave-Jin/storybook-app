const PRODUCTS = [
  {
    id: "book",
    title: "동화책",
    body: "만든 캐릭터가 주인공이 되는 이야기책. 미리 보고, PDF와 하드커버로 남겨 두세요.",
    state: "지금 만들기",
    live: true,
    visual: "book" as const,
  },
  {
    id: "sticker",
    title: "스티커",
    body: "같은 캐릭터의 표정과 동작을 스티커로 모아요. 일기장, 편지, 선물 포장에 붙여요.",
    state: "준비 중",
    live: false,
    visual: "sticker" as const,
  },
  {
    id: "emoji",
    title: "이모티콘",
    body: "채팅에서 쓰는 우리 아이 이모티콘. 기쁨, 응원, 곤한 잠까지 캐릭터 얼굴로 보내요.",
    state: "준비 중",
    live: false,
    visual: "emoji" as const,
  },
  {
    id: "video",
    title: "영상",
    body: "캐릭터가 움직이는 짧은 이야기. 생일, 입학, 가족에게 보내는 영상으로 남겨요.",
    state: "준비 중",
    live: false,
    visual: "video" as const,
  },
];

function ProductVisual({ kind }: { kind: (typeof PRODUCTS)[number]["visual"] }) {
  if (kind === "book") {
    return (
      <div className="overflow-hidden rounded-2xl bg-sky-50">
        <img
          src="/landing/sample-ocean.png"
          alt=""
          className="aspect-[16/10] w-full object-cover"
        />
      </div>
    );
  }

  if (kind === "sticker") {
    const faces = ["✿", "★", "♥", "☁"];
    return (
      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-sky-50 p-4">
        {faces.map((face) => (
          <span
            key={face}
            className="flex aspect-square items-center justify-center rounded-2xl bg-white text-lg text-sky-400 shadow-sm"
          >
            {face}
          </span>
        ))}
      </div>
    );
  }

  if (kind === "emoji") {
    return (
      <div className="flex h-full min-h-[8.5rem] flex-col justify-end gap-2 rounded-2xl bg-sky-50 p-4">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-sky-200 px-3 py-2 text-xs text-sky-900">
          오늘도 잘했어
        </div>
        <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs text-stone-600 shadow-sm">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-300 text-[10px] text-white">
            ◡
          </span>
          고마워!
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-sky-50">
      <img
        src="/landing/sample-zoo.png"
        alt=""
        className="aspect-[16/10] w-full object-cover opacity-80"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-sky-500 shadow-sm">
          ▶
        </span>
      </span>
    </div>
  );
}

export function ProductCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PRODUCTS.map((product) => (
        <article
          key={product.id}
          className="flex flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-stone-100"
        >
          <ProductVisual kind={product.visual} />
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{product.title}</h3>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  product.live
                    ? "bg-sky-100 text-sky-600"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {product.state}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              {product.body}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
