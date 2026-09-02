import type { MetadataRoute } from "next";

// PWA instalável (docs/06-offline-first.md, 6.3) — "Recomendado como padrão
// para dispositivos fixos de operação (PC do caixa, tablet de estoque)".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbix Pulse",
    short_name: "Orbix Pulse",
    description: "O coração do seu negócio continua batendo, mesmo offline.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#7c3aed",
    // SVG único, resolução "any" — ícone gerado via next/og (ImageResponse)
    // quebrava em runtime nesta máquina (Windows + pnpm): bug conhecido do
    // Next.js 14.2.x, o carregamento da fonte padrão interna monta uma
    // file:// URL inválida (`.\file:\C:\...`), mesmo passando fonts: [].
    // Erro é interno ao next/dist/server/og/image-response.js, não dá pra
    // contornar do lado do app — SVG estático evita esse código inteiro.
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
