import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteUrl =
  process.env.AUTH_URL &&
  !/localhost|127\.0\.0\.1/.test(process.env.AUTH_URL)
    ? process.env.AUTH_URL
    : "https://www.panbagi.co.kr";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "판바기 | 사진으로 만드는 우리 아이 캐릭터",
  description:
    "아이 사진으로 캐릭터를 만들고, 그 캐릭터로 동화책·스티커·이모티콘·영상을 이어 가세요.",
  applicationName: "판바기",
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "판바기",
    title: "판바기 | 사진으로 만드는 우리 아이 캐릭터",
    description:
      "아이 사진으로 캐릭터를 만들고, 그 캐릭터로 동화책·스티커·이모티콘·영상을 이어 가세요.",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "판바기",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "판바기 | 사진으로 만드는 우리 아이 캐릭터",
    description:
      "아이 사진으로 캐릭터를 만들고, 그 캐릭터로 동화책·스티커·이모티콘·영상을 이어 가세요.",
    images: ["/brand/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-[family-name:var(--font-geist-sans)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
