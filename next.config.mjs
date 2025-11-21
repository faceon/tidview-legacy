const isExtensionBuild = process.env.TARGET === "extension";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  output: isExtensionBuild ? "export" : undefined,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default config;
