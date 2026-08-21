import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "@/components/LoginForm";

type LoginPageProps = {
  searchParams: {
    registered?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <AuthCard
      title="로그인"
      subtitle="가입한 이메일과 비밀번호로 로그인해 주세요."
      footerText="아직 계정이 없으신가요?"
      footerHref="/signup"
      footerLinkLabel="회원가입"
    >
      <LoginForm registered={searchParams.registered === "1"} />
    </AuthCard>
  );
}
