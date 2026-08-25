import Link from "next/link";
import { CharacterPipeline } from "@/components/landing/CharacterPipeline";
import { CreateWithCharacter } from "@/components/landing/CreateWithCharacter";
import { FaqList } from "@/components/landing/FaqList";
import { LandingNav } from "@/components/landing/LandingNav";
import { SampleBook } from "@/components/landing/SampleBook";

const REASONS = [
  {
    title: "한 번 만든 캐릭터를 다시 씁니다",
    body: "동화책을 만들 때마다 얼굴을 새로 그리지 않아요. 같은 캐릭터가 다음 이야기, 스티커, 영상에도 등장합니다.",
  },
  {
    title: "얼굴이 콘텐츠마다 흔들리지 않아요",
    body: "사진에서 출발한 캐릭터를 기준으로 그리기 때문에, 책과 스티커와 영상이 서로 다른 아이처럼 보이지 않습니다.",
  },
  {
    title: "가족도 함께 넣을 수 있어요",
    body: "아이뿐 아니라 동생, 엄마, 아빠 캐릭터도 만들어 같은 세계에 모아 둘 수 있어요.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "사진을 올려 주세요",
    body: "정면 사진과 이름이면 충분해요. 나이와 분위기를 알려 주시면 더 닮게 나옵니다.",
  },
  {
    step: "02",
    title: "우리 아이 캐릭터가 생겨요",
    body: "얼굴을 닮은 그림 캐릭터가 만들어집니다. 이 캐릭터가 앞으로 만들 모든 콘텐츠의 주인공이에요.",
  },
  {
    step: "03",
    title: "그 캐릭터로 이어 가요",
    body: "지금은 동화책을 만들 수 있고, 같은 캐릭터로 스티커·이모티콘·영상도 곧 열립니다.",
  },
];

export function LandingHome() {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-800 [color-scheme:light]">
      <LandingNav />

      <main>
        <section className="mx-auto max-w-3xl px-4 pb-8 pt-10 text-center sm:px-6 sm:pt-14">
          <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-500 ring-1 ring-sky-100">
            사진 → 캐릭터 → 이야기
          </p>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            우리 아이 사진으로
            <br />
            하나뿐인 <span className="text-sky-500">캐릭터</span>를 만들어요
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-stone-500 sm:text-base">
            동화책만 만드는 서비스가 아닙니다. 캐릭터를 먼저 만들고, 그 캐릭터로
            동화책·스티커·이모티콘·영상을 이어 갑니다.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-sky-400 px-8 text-sm font-semibold text-white hover:bg-sky-500 sm:w-auto"
            >
              캐릭터 만들기
            </Link>
            <a
              href="#products"
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-8 text-sm font-medium text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50 sm:w-auto"
            >
              만들 수 있는 것 보기
            </a>
          </div>
          <div className="mt-10">
            <CharacterPipeline />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h2 className="text-xl font-semibold sm:text-2xl">
            왜 캐릭터를 먼저 만들까요
          </h2>
          <div className="mt-5 space-y-3">
            {REASONS.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl bg-white px-5 py-4 ring-1 ring-stone-100"
              >
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how"
          className="mx-auto max-w-3xl scroll-mt-20 px-4 py-12 sm:px-6"
        >
          <h2 className="text-center text-xl font-semibold sm:text-2xl">
            이렇게 시작해요
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((item) => (
              <article
                key={item.step}
                className="rounded-2xl bg-white p-5 ring-1 ring-stone-100"
              >
                <p className="text-xs font-semibold text-sky-500">{item.step}</p>
                <h3 className="mt-2 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <CreateWithCharacter />

        <section
          id="samples"
          className="mx-auto max-w-3xl scroll-mt-20 px-4 py-12 sm:px-6"
        >
          <h2 className="text-center text-xl font-semibold sm:text-2xl">
            지금 만들 수 있는 동화책
          </h2>
          <p className="mt-2 text-center text-sm text-stone-500">
            캐릭터가 주인공이 되어, 테마와 그림체에 맞춰 장면이 이어집니다.
          </p>
          <div className="mt-6">
            <SampleBook />
          </div>
        </section>

        <section
          id="faq"
          className="mx-auto max-w-3xl scroll-mt-20 px-4 py-12 sm:px-6"
        >
          <h2 className="text-xl font-semibold sm:text-2xl">자주 묻는 질문</h2>
          <p className="mt-2 text-sm text-stone-500">
            캐릭터와 앞으로 만들 콘텐츠를 먼저 모아 두었습니다.
          </p>
          <div className="mt-6">
            <FaqList />
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6">
          <div className="mx-auto max-w-3xl rounded-[28px] bg-sky-300 px-6 py-12 text-center text-sky-950">
            <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">
              먼저, 우리 아이 캐릭터부터
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-sky-800">
              캐릭터만 있으면 동화책은 지금, 스티커·이모티콘·영상은 같은 얼굴로
              이어갈 수 있어요.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-sky-500 shadow-sm"
            >
              캐릭터 만들기 시작
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-sky-100 px-4 py-10 text-sm text-stone-500 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-semibold text-sky-500">스토리북</p>
            <p className="mt-2 max-w-xs leading-relaxed">
              아이 사진으로 캐릭터를 만들고, 그 캐릭터로 동화책·스티커·이모티콘·영상을
              이어 가는 서비스.
            </p>
          </div>
          <div className="flex gap-10">
            <div className="space-y-2">
              <p className="font-medium text-stone-700">바로가기</p>
              <a href="#products" className="block hover:text-stone-800">
                만들 수 있는 것
              </a>
              <a href="#how" className="block hover:text-stone-800">
                만드는 방법
              </a>
              <a href="#faq" className="block hover:text-stone-800">
                FAQ
              </a>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-stone-700">계정</p>
              <Link href="/login" className="block hover:text-stone-800">
                로그인
              </Link>
              <Link href="/signup" className="block hover:text-stone-800">
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
