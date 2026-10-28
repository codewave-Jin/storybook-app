/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "bcryptjs",
      "archiver",
      "openai",
      "satori",
      "harfbuzzjs",
      "sharp",
      "@resvg/resvg-js",
      "@prisma/client",
      "prisma",
    ],
    serverActions: {
      bodySizeLimit: "20mb",
    },
    outputFileTracingIncludes: {
      "/api/emoticons/generate": [
        "./public/fonts/Jua-Regular.ttf",
        "./node_modules/harfbuzzjs/hb.wasm",
      ],
      "/api/internal/gpt-image-worker": ["./node_modules/harfbuzzjs/hb.wasm"],
      "/api/stickers/[id]/generate": ["./node_modules/harfbuzzjs/hb.wasm"],
      "/mediapipe/[name]": ["./node_modules/@mediapipe/tasks-vision/wasm/**/*"],
      "/api/stickers/compose": [
        "./public/fonts/Jua-Regular.ttf",
        "./node_modules/harfbuzzjs/hb.wasm",
      ],
      "/api/media": ["./public/fonts/Jua-Regular.ttf"],
      "/api/media/character/[id]/[kind]": ["./public/fonts/Jua-Regular.ttf"],
      "/api/media/illustration/[id]": ["./public/fonts/Jua-Regular.ttf"],
      "/api/media/sticker/[id]/[kind]": ["./public/fonts/Jua-Regular.ttf"],
    },
  },
};

export default nextConfig;
