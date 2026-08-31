"use client";

import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import { oauthErrorMessage } from "@/lib/oauth-errors";

export function LoginForm({
  registered,
  callbackUrl,
  oauthError,
}: {
  registered?: boolean;
  callbackUrl?: string;
  oauthError?: string;
}) {
  const socialError = oauthErrorMessage(oauthError);

  return (
    <div className="flex flex-col gap-5">
      {registered ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          회원가입이 완료되었습니다. 로그인해 주세요.
        </p>
      ) : null}

      {socialError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {socialError}
        </p>
      ) : null}

      <SocialLoginButtons callbackUrl={callbackUrl} />
    </div>
  );
}
