import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/lib/session";
import { SyncProvider } from "@/lib/sync";

import "./globals.css";

export const metadata: Metadata = {
  title: "Orbix Pulse",
  description: "O coração do seu negócio continua batendo, mesmo offline.",
  // manifest.ts e icon.tsx já são detectados automaticamente pelo Next.js
  // (docs/06-offline-first.md, 6.3) — appleWebApp cobre o que não é: iOS não
  // lê o manifest.webmanifest para o modo standalone, precisa dessa meta tag.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Orbix Pulse",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ServiceWorkerRegister />
          <SessionProvider>
            <SyncProvider>
              <AppShell>{children}</AppShell>
            </SyncProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
