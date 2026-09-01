import Link from "next/link";
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

  const callbackUrl = searchParams.callbackUrl?.trim() || undefined;
  const switchQuery = callbackUrl
    ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "";

  if (session?.user) {
    return (
      <AuthCard
        title="관리자 로그인"
        subtitle="다른 계정으로 로그인한 상태입니다. 관리자 계정으로 전환해 주세요."
      >
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-stone-700 ring-1 ring-amber-100">
          <p>
            현재 로그인:{" "}
            <span className="font-medium">{session.user.email}</span>
          </p>
          <p className="mt-1 text-stone-600">
            같은 브라우저에서는 테스트 계정 세션이 유지되면 관리자 페이지에
            들어갈 수 없습니다.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/api/auth/force-logout?callbackUrl=${encodeURIComponent(
              `/admin/login${switchQuery}`,
            )}`}
            className="flex h-11 items-center justify-center rounded-xl border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            로그아웃 후 관리자 로그인
          </Link>
          <Link
            href="/dashboard"
            className="flex h-11 items-center justify-center text-sm text-stone-500 hover:underline"
          >
            대시보드로 돌아가기
          </Link>
        </div>

        <div className="mt-6 border-t border-stone-200 pt-6">
          <p className="text-sm font-medium text-stone-700">
            또는 아래에서 관리자 계정으로 바로 로그인
          </p>
          <div className="mt-3">
            <AdminLoginForm callbackUrl={callbackUrl} />
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="관리자 로그인"
      subtitle="관리자 또는 테스트 계정으로 로그인해 주세요."
    >
      <AdminLoginForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
