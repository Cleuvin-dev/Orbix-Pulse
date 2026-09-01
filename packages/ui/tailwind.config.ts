import type { Config } from "tailwindcss";

// Config base compartilhada. Apps consumidores estendem via `presets: [require("@orbix/ui/tailwind.config")]`.
const config: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        // Ancoragem de identidade visual (ver docs/00-nome-e-conceito.md): azul/roxo profundo
        // como cor primária, verde-pulso e âmbar reservados para indicadores de status de sincronização.
        pulse: {
          online: "#22c55e",
          syncing: "#f59e0b",
          offline: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};

export default config;
