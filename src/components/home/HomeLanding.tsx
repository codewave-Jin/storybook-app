import Link from "next/link";
import { AppImage } from "@/components/AppImage";
import { BeforeAfterGallery } from "@/components/home/BeforeAfterGallery";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeNav } from "@/components/home/HomeNav";
import { MakeMore } from "@/components/home/MakeMore";
import { MediaSlot } from "@/components/home/MediaSlot";
import { StoryShowcase } from "@/components/home/StoryShowcase";
import {
  characterStartHref,
  HOME_MEDIA,
} from "@/components/home/media";

type HomeLandingProps = {
  isLoggedIn: boolean;
};

const DIFFERENTIALS = [
  {
    title: "실제 얼굴 기반 AI 캐릭터화",
    body: "이름만 바꾸는 책이 아니라, 우리 가족의 눈매와 미소를 그림 속 주인공으로 담아요.",
  },
  {
    title: "가족 최대 3명까지 함께 등장",
    body: "아이만 나오는 이야기가 아니에요. 엄마, 아빠, 아이가 같은 장면 안에 함께 등장합니다.",
  },
  {
    title: "한 번 만든 캐릭터로 이어가요",
    body: "같은 얼굴로 동화책, 스티커, 이모티콘, 영상까지 만들 수 있어요.",
  },
];

const TRIAL_STEPS = [
  {
    n: "1",
    title: "사진 올리기",
    body: "정면 사진 한 장이면 시작돼요.",
    image: "/landing/trial-photo-upload.jpg",
    imageAlt: "사진을 올려 캐릭터를 만드는 모습",
  },
  {
    n: "2",
    title: "캐릭터 변환",
    body: "사랑스러운 그림체로 다시 그려요.",
    image: "/landing/trial-character-convert.jpg",
    imageAlt: "사진을 입력하면 귀여운 캐릭터로 변신하는 모습",
  },
  {
    n: "3",
    title: "결과 확인",
    body: "마음에 들면 동화책과 스티커로 이어가요.",
    image: "/landing/trial-result-confirm.jpg",
    imageAlt: "가족과 함께 완성된 동화책을 확인하는 모습",
  },
];

const BOOK_STEPS = [
  {
    step: "STEP 1",
    title: "가족 캐릭터 만들기",
    body: "사진을 올리고, 최대 5명 슬롯 중 원하는 만큼 캐릭터를 만들어요.",
  },
  {
    step: "STEP 2",
    title: "동화책 · 스티커 선택",
    body: "캐릭터가 준비되면, 동화책이나 스티커로 이어가요. (영상은 곧 추가돼요)",
  },
  {
    step: "STEP 3",
    title: "표지와 삽화 먼저 확인하기",
    body: "표지와 삽화 2장을 먼저 만들어드려요. 마음에 드실 때 완성을 진행하시면 돼요.",
  },
];

const PRODUCTS = [
  {
    name: "가족 맞춤 캐릭터",
    detail: "최대 3명까지 동화책에 함께 등장",
  },
  {
    name: "다양한 테마 동화책",
    detail: "생활습관, 모험 등 우리 가족에 맞는 이야기",
  },
  {
    name: "캐릭터 스티커",
    detail: "같은 캐릭터로 만드는 우리 가족 스티커",
  },
  {
    name: "인쇄 / 배송",
    detail: "추후 안내",
  },
];

function CreateButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-full bg-sky-400 px-8 text-sm font-semibold text-white hover:bg-sky-500"
    >
      {label}
    </Link>
  );
}

export function HomeLanding({ isLoggedIn }: HomeLandingProps) {
  const createHref = characterStartHref(isLoggedIn);

  return (
    <div className="home-landing min-h-dvh overflow-x-hidden bg-stone-50 text-stone-800">
      <HomeNav isLoggedIn={isLoggedIn} />

      <main>
        <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-8 pt-10 sm:px-6 sm:pb-12 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="pointer-events-none absolute right-8 top-0 h-40 w-40 rounded-full bg-[#F6E7C1]/70 blur-3xl lg:right-24" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-500 ring-1 ring-sky-100">
                사진 → 캐릭터 → 동화책 · 스티커 · 이모티콘 · 영상
              </p>
            </div>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              우리 가족의 얼굴로,
              <br />
              우리 가족만의 캐릭터를
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-stone-500 sm:text-base">
              사진 한 장이면 충분해요. 엄마, 아빠, 아이가 주인공이 됩니다.
            </p>
            <div className="mt-8">
              <CreateButton href={createHref} label="무료로 캐릭터 만들어보기" />
            </div>
          </div>

          <div className="relative">
            <BeforeAfterGallery />
          </div>
        </section>

        <StoryShowcase />

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              똑같이 베끼지 않아요, 사랑스럽게 담아요
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-500 sm:text-base">
              AI가 아이 얼굴을 그대로 복제하면 오히려 어색하고 낯설게 느껴질 수
              있어요. 저희는 눈매, 미소, 헤어스타일 같은 사랑스러운 특징만
              자연스럽게 담아, 그림책 속 캐릭터로 재탄생시켜드려요.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
              <figure className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-sky-100">
                <div className="aspect-[4/5]">
                  <MediaSlot
                    src={HOME_MEDIA.whyPhoto}
                    alt="실제 얼굴 사진 예시"
                    label="실제 얼굴"
                    kind="child"
                    tone="photo"
                  />
                </div>
              </figure>
              <p
                aria-hidden
                className="text-center text-3xl font-light text-sky-400 sm:text-4xl"
              >
                →
              </p>
              <figure className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-sky-100">
                <div className="aspect-[4/5]">
                  <MediaSlot
                    src={HOME_MEDIA.whyCharacter}
                    alt="그림책 캐릭터 예시"
                    label="그림 캐릭터"
                    kind="child"
                    tone="art"
                  />
                </div>
              </figure>
            </div>
            <p className="mt-4 text-center text-sm font-medium text-[#E07A5F]">
              실사가 아닌, 사랑스러운 그림체로
            </p>
          </div>
        </section>

        <section
          id="how"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
        >
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            이렇게 시작해요
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {BOOK_STEPS.map((item) => (
              <article
                key={item.step}
                className="rounded-[24px] border border-sky-100 bg-white p-6"
              >
                <p className="text-xs font-semibold tracking-wide text-sky-500">
                  {item.step}
                </p>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-sky-50/80 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              이름만 넣는 동화책이 아니에요
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {DIFFERENTIALS.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-sky-100"
                >
                  <p className="text-xs font-semibold tracking-wide text-[#E07A5F]">
                    0{index + 1}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-500">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="create"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
        >
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            결제 전에 먼저 확인하세요
          </h2>
          <p className="mt-3 text-center text-sm text-stone-500 sm:text-base">
            사진만 올리면 캐릭터로 어떻게 나오는지 바로 볼 수 있어요.
          </p>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {TRIAL_STEPS.map((item, index) => (
              <div key={item.n} className="relative">
                <article className="flex h-full flex-col overflow-hidden rounded-[24px] bg-white text-center ring-1 ring-sky-100">
                  {item.image ? (
                    <div className="relative aspect-[4/3] w-full bg-sky-50">
                      <AppImage
                        src={item.image}
                        alt={item.imageAlt ?? item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="flex justify-center pt-8">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDE8E0] text-lg font-semibold text-[#E07A5F]">
                        {item.n}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col items-center px-5 pb-8 pt-5">
                    {item.image ? (
                      <span className="mb-2 text-xs font-semibold tracking-wide text-[#E07A5F]">
                        {item.n}
                      </span>
                    ) : null}
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-stone-500">
                      {item.body}
                    </p>
                  </div>
                </article>
                {index < TRIAL_STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute right-[-0.7rem] top-1/2 hidden -translate-y-1/2 text-xl text-sky-400 sm:block"
                  >
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <CreateButton href={createHref} label="지금 무료로 체험하기" />
          </div>
        </section>

        <section className="bg-sky-50/80">
          <MakeMore isLoggedIn={isLoggedIn} />
        </section>

        <section
          id="themes"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
        >
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            상품 구성
          </h2>
          <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-[24px] bg-white ring-1 ring-sky-100">
            <table className="w-full text-left text-sm sm:text-base">
              <thead className="bg-[#F6E7C1]/60 text-stone-600">
                <tr>
                  <th className="px-5 py-4 font-medium">구성</th>
                  <th className="px-5 py-4 font-medium">내용</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTS.map((item) => (
                  <tr
                    key={item.name}
                    className="border-t border-sky-50 text-stone-800"
                  >
                    <td className="px-5 py-4 font-medium">{item.name}</td>
                    <td className="px-5 py-4 text-stone-500">{item.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            안심하고 맡겨 주세요
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="rounded-[24px] bg-white p-6 ring-1 ring-sky-100">
              <h3 className="font-semibold">안전한 결제</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                결제 정보는 안전하게 처리되며, 서비스 이용에 필요한 범위에서만
                사용됩니다.
              </p>
            </article>
            <article className="rounded-[24px] bg-white p-6 ring-1 ring-sky-100">
              <h3 className="font-semibold">개인정보 보호</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                올려 주신 가족 사진은 캐릭터 제작 목적에만 쓰이며, 외부에 공개하지
                않습니다.
              </p>
            </article>
            <article className="rounded-[24px] bg-white p-6 ring-1 ring-sky-100">
              <h3 className="font-semibold">환불 정책</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                추후 안내
              </p>
            </article>
          </div>
        </section>

        <section
          id="faq"
          className="mx-auto max-w-3xl scroll-mt-20 px-4 py-8 sm:px-6 sm:py-16"
        >
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            자주 묻는 질문
          </h2>
          <div className="mt-6">
            <HomeFaq />
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl rounded-[32px] bg-sky-300 px-6 py-12 text-center text-sky-950 sm:px-10 sm:py-16">
            <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">
              생일, 가족여행, 크리스마스 등
              <br />
              특별한 날의 선물로
            </h2>
            <Link
              href={createHref}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-sky-500 shadow-sm"
            >
              시작하기
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-sky-100 px-4 py-12 text-sm text-stone-500 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <p className="text-base font-semibold text-sky-500">스토리북</p>
            <p className="mt-3 max-w-xs leading-relaxed">
              얼굴 사진으로 가족이 주인공이 되는 맞춤 동화책을 만듭니다.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-stone-700">서비스</p>
            <a href="#create" className="block hover:text-stone-800">
              캐릭터 만들기
            </a>
            <a href="#products" className="block hover:text-stone-800">
              만들 수 있는 것
            </a>
            <a href="#faq" className="block hover:text-stone-800">
              FAQ
            </a>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-stone-700">고객지원</p>
            <Link href="/login" className="block hover:text-stone-800">
              로그인
            </Link>
            <Link href="/signup" className="block hover:text-stone-800">
              회원가입
            </Link>
            <a href="#faq" className="block hover:text-stone-800">
              자주 묻는 질문
            </a>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-stone-700">회사 정보</p>
            <p>상호: 추후 안내</p>
            <p>사업자등록번호: 추후 안내</p>
            <p>이메일: 추후 안내</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
