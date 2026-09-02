"use client";

import { useEffect } from "react";

// docs/06-offline-first.md (6.2, 6.3, 6.7): registra o Service Worker gerado
// pelo Serwist (só existe em build de produção — desligado em dev, ver
// next.config.mjs) pra deixar o app shell disponível offline. Precisa ser
// registrado com internet ao menos uma vez antes de funcionar offline.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Falha ao registrar o Service Worker:", error);
    });
  }, []);

  return null;
}
