"use client";

import { signInWithProvider } from "@/app/actions/auth";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

function KakaoMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#191919"
        d="M12 4C7.03 4 3 7.13 3 10.98c0 2.47 1.64 4.64 4.11 5.89l-.86 3.2c-.08.3.27.54.52.36l3.8-2.53c.47.05.95.08 1.43.08 4.97 0 9-3.13 9-6.98S16.97 4 12 4Z"
      />
    </svg>
  );
}

function NaverMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M14.6 12.55 9.13 4.8H4.8v14.4h5.05v-7.75l5.47 7.75H20.2V4.8h-5.6v7.75Z"
      />
    </svg>
  );
}

const PROVIDERS = [
  {
    id: "google",
    label: "Google로 계속하기",
    className:
      "border border-[#747775] bg-white text-[#1F1F1F] hover:bg-stone-50",
    icon: <GoogleMark />,
  },
  {
    id: "kakao",
    label: "카카오로 계속하기",
    className: "border border-[#FEE500] bg-[#FEE500] text-[#191919] hover:bg-[#F6DC00]",
    icon: <KakaoMark />,
  },
  {
    id: "naver",
    label: "네이버로 계속하기",
    className: "border border-[#03C75A] bg-[#03C75A] text-white hover:bg-[#02B350]",
    icon: <NaverMark />,
  },
] as const;

export function SocialLoginButtons({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {PROVIDERS.map((provider) => (
        <form key={provider.id} action={signInWithProvider}>
          <input type="hidden" name="provider" value={provider.id} />
          {callbackUrl ? (
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
          ) : null}
          <button
            type="submit"
            className={`flex h-12 w-full items-center justify-center gap-3 rounded-xl text-base font-medium transition ${provider.className}`}
          >
            {provider.icon}
            {provider.label}
          </button>
        </form>
      ))}
    </div>
  );
}

