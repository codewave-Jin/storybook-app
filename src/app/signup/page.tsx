import { AuthCard } from "@/components/AuthCard";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import { oauthErrorMessage } from "@/lib/oauth-errors";

type SignupPageProps = {
  searchParams: {
    callbackUrl?: string;
    error?: string;
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  const socialError = oauthErrorMessage(searchParams.error);

  return (
    <AuthCard
      title="회원가입"
      subtitle="구글, 카카오, 네이버 계정으로 바로 시작할 수 있습니다."
      footerText="이미 계정이 있으신가요?"
      footerHref="/login"
      footerLinkLabel="로그인"
    >
      <div className="flex flex-col gap-5">
        {socialError ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {socialError}
          </p>
        ) : null}
        <SocialLoginButtons callbackUrl={searchParams.callbackUrl} />
      </div>
    </AuthCard>
  );
}
