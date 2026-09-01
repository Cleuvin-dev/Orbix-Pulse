import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Orbix Pulse",
  description: "O coração do seu negócio continua batendo, mesmo offline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
