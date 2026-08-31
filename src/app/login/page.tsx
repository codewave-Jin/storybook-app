import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "@/components/LoginForm";

type LoginPageProps = {
  searchParams: {
    registered?: string;
    callbackUrl?: string;
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <AuthCard
      title="로그인"
      subtitle="구글, 카카오, 네이버 계정으로 로그인해 주세요."
      footerText="아직 계정이 없으신가요?"
      footerHref="/signup"
      footerLinkLabel="회원가입"
    >
      <LoginForm
        registered={searchParams.registered === "1"}
        callbackUrl={searchParams.callbackUrl}
        oauthError={searchParams.error}
      />
    </AuthCard>
  );
}
