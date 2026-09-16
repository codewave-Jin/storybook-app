import type { Prisma } from "@prisma/client";
import { AdminUsersBoard } from "@/components/admin/AdminUsersBoard";
import { formatDateTime } from "@/lib/orders";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

function usersHref(query: string, page: number) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const value = params.toString();
  return value ? `/admin/users?${value}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const query = searchParams.q?.trim() ?? "";
  const requestedPage = Math.max(
    1,
    Number.parseInt(searchParams.page ?? "1", 10) || 1,
  );

  const where: Prisma.UserWhereInput = query
    ? {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      tokenBalance: {
        select: { freeBalance: true, paidBalance: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const rows = users.map((user) => {
    const freeBalance = user.tokenBalance?.freeBalance ?? 0;
    const paidBalance = user.tokenBalance?.paidBalance ?? 0;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: formatDateTime(user.createdAt),
      freeBalance,
      paidBalance,
      totalTokens: freeBalance + paidBalance,
    };
  });

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        회원 리스트
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        이메일·이름으로 찾고, 보유 토큰을 확인한 뒤 유료 토큰을 지급할 수 있습니다.
      </p>

      <form
        method="get"
        className="mt-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <label className="block min-w-0 flex-1 text-sm">
          <span className="mb-1.5 block font-medium text-stone-700">회원 검색</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="이메일 또는 이름"
            className="h-10 w-full rounded-lg border border-stone-300 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-lg bg-sky-400 px-4 text-sm font-medium text-white hover:bg-sky-500"
        >
          검색
        </button>
      </form>

      <p className="mt-4 text-sm text-stone-500">
        총 {total.toLocaleString("ko-KR")}명
        {query ? ` · “${query}” 검색 결과` : ""}
      </p>

      <AdminUsersBoard users={rows} />

      {totalPages > 1 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {currentPage > 1 ? (
            <a
              href={usersHref(query, currentPage - 1)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            >
              이전
            </a>
          ) : null}
          <span className="text-sm text-stone-500">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <a
              href={usersHref(query, currentPage + 1)}
              className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            >
              다음
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
