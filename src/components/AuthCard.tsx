import Link from "next/link";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerText: string;
  footerHref: string;
  footerLinkLabel: string;
};

export function AuthCard({
  title,
  subtitle,
  children,
  footerText,
  footerHref,
  footerLinkLabel,
}: AuthCardProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 py-8 text-stone-900 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium tracking-wide text-sky-500"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-400 text-xs font-semibold text-white">
              S
            </span>
            스토리북
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-stone-500 sm:text-base">{subtitle}</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-stone-500">
          {footerText}{" "}
          <Link
            href={footerHref}
            className="font-medium text-sky-600 underline underline-offset-4"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
