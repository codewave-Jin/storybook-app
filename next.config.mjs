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
      "sharp",
      "@resvg/resvg-js",
      "@prisma/client",
      "prisma",
    ],
    serverActions: {
      bodySizeLimit: "20mb",
    },
    outputFileTracingIncludes: {
      "/api/stickers/compose": ["./public/fonts/Jua-Regular.ttf"],
      "/api/media": ["./public/fonts/Jua-Regular.ttf"],
      "/api/media/character/[id]/[kind]": ["./public/fonts/Jua-Regular.ttf"],
      "/api/media/illustration/[id]": ["./public/fonts/Jua-Regular.ttf"],
      "/api/media/sticker/[id]/[kind]": ["./public/fonts/Jua-Regular.ttf"],
    },
  },
};

export default nextConfig;
