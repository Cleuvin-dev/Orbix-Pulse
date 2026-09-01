import type { Metadata } from "next";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { DevSessionProvider } from "@/lib/dev-session";

import "./globals.css";

export const metadata: Metadata = {
  title: "Orbix Pulse",
  description: "O coração do seu negócio continua batendo, mesmo offline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <DevSessionProvider>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Topbar />
              <main className="flex-1 overflow-y-auto bg-secondary/40 p-6">{children}</main>
            </div>
          </div>
        </DevSessionProvider>
      </body>
    </html>
  );
}
