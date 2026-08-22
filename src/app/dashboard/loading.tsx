export default function DashboardLoading() {
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-900 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-stone-200" />
            <div className="h-8 w-40 animate-pulse rounded bg-stone-200" />
          </div>
          <div className="h-10 w-24 animate-pulse rounded-xl bg-stone-200" />
        </div>
        <div className="mt-6 space-y-4">
          <div className="h-11 max-w-md animate-pulse rounded-xl bg-stone-200" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[4/5] animate-pulse rounded-2xl bg-stone-200"
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
