import { AdminGrantTokensForm } from "@/components/admin/AdminGrantTokensForm";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  freeBalance: number;
  paidBalance: number;
  totalTokens: number;
};

export function AdminUsersBoard({ users }: { users: AdminUserRow[] }) {
  return (
    <div className="mt-4">
      <div className="space-y-3 md:hidden">
        {users.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white px-4 py-12 text-center text-sm text-stone-400">
            회원이 없습니다.
          </p>
        ) : (
          users.map((user) => (
            <article
              key={user.id}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{user.name}</p>
                {user.isAdmin ? (
                  <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs font-semibold text-white">
                    관리자
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 break-all text-xs text-stone-400">
                {user.email}
              </p>
              <p className="mt-1 text-xs text-stone-400">{user.createdAt}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl bg-stone-50 px-2 py-2">
                  <dt className="text-xs text-stone-400">무료</dt>
                  <dd className="mt-0.5 font-semibold">{user.freeBalance}</dd>
                </div>
                <div className="rounded-xl bg-stone-50 px-2 py-2">
                  <dt className="text-xs text-stone-400">유료</dt>
                  <dd className="mt-0.5 font-semibold">{user.paidBalance}</dd>
                </div>
                <div className="rounded-xl bg-sky-50 px-2 py-2">
                  <dt className="text-xs text-sky-600">합계</dt>
                  <dd className="mt-0.5 font-semibold text-sky-700">
                    {user.totalTokens}
                  </dd>
                </div>
              </dl>
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-stone-500">
                  유료 토큰 지급
                </p>
                <AdminGrantTokensForm userId={user.id} />
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">회원</th>
              <th className="px-4 py-3 font-medium">가입일</th>
              <th className="px-4 py-3 font-medium">무료</th>
              <th className="px-4 py-3 font-medium">유료</th>
              <th className="px-4 py-3 font-medium">합계</th>
              <th className="px-4 py-3 font-medium">토큰 지급</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-stone-400">
                  회원이 없습니다.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {user.isAdmin ? (
                        <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs font-semibold text-white">
                          관리자
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 break-all text-xs text-stone-400">
                      {user.email}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top text-stone-600">
                    {user.createdAt}
                  </td>
                  <td className="px-4 py-3 align-top">{user.freeBalance}</td>
                  <td className="px-4 py-3 align-top">{user.paidBalance}</td>
                  <td className="px-4 py-3 align-top font-semibold">
                    {user.totalTokens}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <AdminGrantTokensForm userId={user.id} compact />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
