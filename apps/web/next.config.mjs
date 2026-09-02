import withSerwistInit from "@serwist/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@orbix/ui", "@orbix/types", "@orbix/validation"],
};

// Service Worker (docs/06-offline-first.md, 6.2) — cache de assets, deixa o
// app shell disponível offline. Desligado em dev (recarregar o SW a cada
// mudança de código atrapalha o hot reload) — só ativo em build de produção.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
