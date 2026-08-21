import { AuthCard } from "@/components/AuthCard";
import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <AuthCard
      title="회원가입"
      subtitle="이메일과 비밀번호로 계정을 만들어 주세요."
      footerText="이미 계정이 있으신가요?"
      footerHref="/login"
      footerLinkLabel="로그인"
    >
      <SignupForm />
    </AuthCard>
  );
}
