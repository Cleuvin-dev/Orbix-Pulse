import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// docs/06-offline-first.md (6.2, 6.7): o app precisa abrir e funcionar sem
// rede — o Service Worker cacheia os assets do build (JS/CSS/imagens) e o
// shell da aplicação. Dados de negócio (produtos, vendas etc.) não passam
// por aqui — isso é o Dexie/IndexedDB (lib/db), uma camada abaixo.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
