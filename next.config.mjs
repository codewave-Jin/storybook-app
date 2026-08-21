/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    serverComponentsExternalPackages: ["bcrypt", "archiver", "openai"],
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
