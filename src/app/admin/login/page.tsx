import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { auth } from "@/auth";

type AdminLoginPageProps = {
  searchParams: {
    callbackUrl?: string;
  };
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const session = await auth();
  if (session?.user?.isAdmin) {
    redirect("/admin");
  }
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <AuthCard
      title="관리자 로그인"
      subtitle="관리자 또는 테스트 계정으로 로그인해 주세요."
    >
      <AdminLoginForm callbackUrl={searchParams.callbackUrl} />
    </AuthCard>
  );
}
