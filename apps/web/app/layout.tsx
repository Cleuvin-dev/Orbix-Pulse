import type { Metadata, Viewport } from "next";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ThemeProvider } from "@/components/theme-provider";
import { DevSessionProvider } from "@/lib/dev-session";

import "./globals.css";

export const metadata: Metadata = {
  title: "Orbix Pulse",
  description: "O coração do seu negócio continua batendo, mesmo offline.",
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DevSessionProvider>
            <div className="flex h-screen">
              <Sidebar />
              <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto bg-secondary/40 p-6">{children}</main>
              </div>
            </div>
          </DevSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
