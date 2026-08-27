import { NextResponse } from "next/server";
import { signOut } from "@/auth";

function safeCallbackPath(value: string | null) {
  if (!value) {
    return "/login";
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/login";
  }
  return value;
}

/** 서버 컴포넌트에서는 쿠키를 못 지워서, stale session 정리는 여기로 보냅니다. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackUrl = safeCallbackPath(url.searchParams.get("callbackUrl"));

  await signOut({ redirect: false });
  return NextResponse.redirect(new URL(callbackUrl, url.origin));
}
