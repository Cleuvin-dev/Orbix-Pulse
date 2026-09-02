import { nextConfig } from "@orbix/config/eslint/next";

export default [
  // public/sw.js é gerado pelo Serwist no build (docs/06-offline-first.md,
  // 6.2) — bundle minificado, não é código-fonte deste repo.
  { ignores: ["public/sw.js"] },
  ...nextConfig,
  {
    // next.config.mjs roda em Node puro (build time), não no browser — regras
    // TS "recommended" (que desligam no-undef) não cobrem arquivo .mjs.
    files: ["next.config.mjs"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
];
