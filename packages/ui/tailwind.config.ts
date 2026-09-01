import type { Config } from "tailwindcss";

// Config base compartilhada. Apps consumidores estendem via `presets: [require("@orbix/ui/tailwind.config")]`.
// Paleta em variáveis CSS (padrão shadcn/ui) — definidas em :root/.dark pelo app consumidor.
const config: Omit<Config, "content"> = {
  darkMode: ["class"],
  // A classe "dark" é aplicada em runtime pelo next-themes (nunca aparece
  // escrita em JSX estático), então o content-scan do Tailwind nunca a "vê" —
  // sem safelist, a regra `.dark { ... }` de @layer base é descartada em
  // silêncio (nenhum erro, nenhum aviso) por parecer não utilizada.
  safelist: ["dark"],
  theme: {
    extend: {
      colors: {
        // Indicador de status online/sincronizando/offline (docs/06-offline-first.md, 6.6)
        // — cores fixas, não seguem o tema claro/escuro.
        pulse: {
          online: "#22c55e",
          syncing: "#f59e0b",
          offline: "#ef4444",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          from: "hsl(var(--brand-from))",
          to: "hsl(var(--brand-to))",
        },
        // Chrome de marca (sidebar) — sempre escuro, reflete a paleta de
        // img/Orbix.jpeg independente do tema claro/escuro do conteúdo.
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          "muted-foreground": "hsl(var(--sidebar-muted-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, hsl(var(--brand-from)), hsl(var(--brand-to)))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
