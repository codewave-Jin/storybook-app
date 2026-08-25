export function CharacterPipeline() {
  return (
    <div className="rounded-[28px] bg-white p-4 ring-1 ring-sky-100 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <figure className="text-center">
          <div className="overflow-hidden rounded-3xl bg-sky-50">
            <img
              src="/landing/hero.png"
              alt="아이 사진 예시"
              className="aspect-square w-full object-cover"
            />
          </div>
          <figcaption className="mt-3 text-sm font-medium text-stone-600">
            1. 사진
          </figcaption>
        </figure>

        <p
          aria-hidden
          className="text-center text-2xl font-light text-sky-300 sm:text-3xl"
        >
          →
        </p>

        <figure className="text-center">
          <div className="relative flex aspect-square items-end justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50 to-sky-100">
            <div className="mb-8 flex w-36 flex-col items-center">
              <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[#f3d0b8] shadow-sm">
                <span className="text-2xl leading-none text-stone-700">◡</span>
              </div>
              <div className="mt-1 h-16 w-24 rounded-t-[2rem] bg-sky-300" />
            </div>
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-sky-600">
              우리 아이 캐릭터
            </span>
          </div>
          <figcaption className="mt-3 text-sm font-medium text-stone-600">
            2. 하나뿐인 캐릭터
          </figcaption>
        </figure>
      </div>

      <p className="mt-6 text-center text-sm font-medium text-sky-500">
        같은 캐릭터로 이어져요
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "동화책", state: "지금" },
          { label: "스티커", state: "예정" },
          { label: "이모티콘", state: "예정" },
          { label: "영상", state: "예정" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl bg-stone-50 px-3 py-3 text-center ring-1 ring-sky-100"
          >
            <p className="text-sm font-semibold text-stone-800">{item.label}</p>
            <p
              className={`mt-1 text-[11px] ${
                item.state === "지금" ? "text-sky-500" : "text-stone-400"
              }`}
            >
              {item.state}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
