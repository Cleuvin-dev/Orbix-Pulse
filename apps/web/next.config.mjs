/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@orbix/ui", "@orbix/types", "@orbix/validation"],
};

export default nextConfig;
