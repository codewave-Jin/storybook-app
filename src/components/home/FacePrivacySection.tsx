import { AppImage } from "@/components/AppImage";
import { MediaSlot } from "@/components/home/MediaSlot";
import { HOME_MEDIA } from "@/components/home/media";

function PipelineArrow() {
  return (
    <p
      aria-hidden
      className="py-1 text-center text-xl font-light text-sky-400 lg:px-2 lg:py-0 lg:text-3xl"
    >
      <span className="lg:hidden">↓</span>
      <span className="hidden lg:inline">→</span>
    </p>
  );
}

function PhotoReuseMockup() {
  return (
    <figure className="overflow-hidden rounded-[24px] bg-white p-2.5 shadow-sm ring-1 ring-sky-100 sm:p-3">
      <div className="overflow-hidden rounded-[18px] bg-[#F7F1E8]">
        <AppImage
          src="/landing/photo-product.png"
          alt="아이 얼굴 사진이 들어간 포토북, 스티커, 키링, 머그컵 등 굿즈 예시"
          width={1536}
          height={1024}
          className="h-auto w-full"
          sizes="(max-width: 1024px) 70vw, 360px"
        />
      </div>
      <figcaption className="px-1 pb-1 pt-3 text-center text-xs font-medium text-stone-600 sm:text-sm">
        같은 얼굴 사진이 굿즈에 그대로 쓰여요
      </figcaption>
    </figure>
  );
}

function PipelinePhoto() {
  return (
    <figure className="w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sky-100 sm:rounded-[28px]">
      <div className="aspect-[4/5]">
        <MediaSlot
          src={HOME_MEDIA.whyPhoto}
          alt="아이 사진 예시"
          label="아이 사진"
          kind="child"
          tone="photo"
          showLabel={false}
        />
      </div>
    </figure>
  );
}

function PipelineCharacter() {
  return (
    <figure className="w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sky-100 sm:rounded-[28px]">
      <div className="aspect-[4/5]">
        <MediaSlot
          src={HOME_MEDIA.whyCharacter}
          alt="판바기 캐릭터 예시"
          label="판바기 캐릭터"
          kind="child"
          tone="art"
          showLabel={false}
        />
      </div>
    </figure>
  );
}

function PipelineGoods() {
  return (
    <figure className="w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sky-100 sm:rounded-[28px]">
      <div className="aspect-[4/5]">
        <MediaSlot
          src={HOME_MEDIA.whyGoods}
          alt="캐릭터로 만든 동화책, 스티커, 이모티콘 예시"
          label="동화책 · 스티커 · 이모티콘"
          kind="child"
          tone="art"
          showLabel={false}
        />
      </div>
    </figure>
  );
}

export function FacePrivacySection() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-600 ring-1 ring-sky-100">
            얼굴 사진 굿즈를 만들기 전에
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-stone-800 sm:text-4xl">
            우리 아이 얼굴,
            <br />
            꼭 그대로 사용해야 할까요?
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
          <div className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
            <PhotoReuseMockup />
          </div>
          <div className="text-center lg:text-left">
            <p className="text-base leading-relaxed text-stone-800 sm:text-[1.125rem] sm:leading-8">
              아이의 사진으로 만드는 굿즈는 특별하지만,
              <br /> 그만큼 아이의 실제 얼굴도 그대로 사용됩니다.
            
            </p>
            <p className="mt-4 text-base leading-relaxed text-stone-800 sm:text-[1.125rem] sm:leading-8">
              AI 이미지 생성과 합성 기술이 발전한 지금, 
              <br /> 온라인에 공유되는 얼굴 이미지도 조금 더 신중하게 생각할 필요가 있습니다.
            </p>
            <p className="mx-auto mt-8 max-w-lg rounded-2xl bg-[#E07A5F]/10 px-5 py-4 text-base font-semibold leading-relaxed text-[#C45C42] sm:text-lg lg:mx-0">
              소중한 추억을 남기면서도
              <br />
              아이의 얼굴 노출은 줄일 수 없을까요?
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            그래서 판바기는
            <br />
            사진을 그대로 사용하지 않습니다.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-500 sm:text-base">
            얼굴을 똑같이 복제하면 어색하고 낯설게 느껴질 수 있어요. 눈매, 미소,
            헤어스타일 같은 사랑스러운 특징만 자연스럽게 담아 그림 캐릭터로
            만들어요.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-stone-500 sm:text-base">
            실제 얼굴 사진 대신, 이렇게 만든 캐릭터로 동화책·스티커·이모티콘을
            제작합니다.
          </p>
          <p className="mt-6 text-sm font-medium leading-relaxed text-[#E07A5F] sm:text-base">
            얼굴은 덜 노출하고,
            <br />
            우리 아이만의 특별함은 그대로.
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-sm sm:mt-10 lg:max-w-5xl">
          <div className="flex flex-col items-center lg:flex-row lg:items-center">
            <div className="w-full min-w-0 flex-1">
              <PipelinePhoto />
              <p className="mt-3 text-center text-sm font-medium text-stone-600">
                아이 사진
              </p>
            </div>
            <PipelineArrow />
            <div className="w-full min-w-0 flex-1">
              <PipelineCharacter />
              <p className="mt-3 text-center text-sm font-medium text-stone-600">
                그림 캐릭터
              </p>
            </div>
            <PipelineArrow />
            <div className="w-full min-w-0 flex-1">
              <PipelineGoods />
              <p className="mt-3 text-center text-sm font-medium text-stone-600">
                동화책 · 스티커 · 이모티콘
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-medium text-[#E07A5F] sm:mt-4">
            실사가 아닌, 사랑스러운 그림체로
          </p>
        </div>
      </section>
    </>
  );
}
