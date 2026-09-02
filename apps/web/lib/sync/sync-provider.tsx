"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { clearLocalDatabase, db } from "@/lib/db";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase/client";

import { hydrateLocalDatabase } from "./hydrate";

// Indicador de status obrigatório na UI (docs/06-offline-first.md, 6.6) —
// os 3 estados são exatamente os do doc, não inventados aqui.
export type SyncStatus = "SYNCED" | "SYNCING" | "OFFLINE";

interface SyncContextValue {
  status: SyncStatus;
  pendingCount: number;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { status: sessionStatus } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);
  const hydratedForSession = useRef(false);

  // syncQueue continua sempre vazia até o Sync Engine real (Fase 9) escrever
  // operações aqui a partir de ações feitas offline — hoje isso só reflete a
  // realidade atual (0), não é um valor inventado.
  const pendingCount =
    useLiveQuery(() => db.syncQueue.where("status").anyOf(["PENDING", "SYNCING", "SYNC_ERROR"]).count(), []) ?? 0;

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      hydratedForSession.current = false;
      void clearLocalDatabase(); // docs/06-offline-first.md, 6.4 — nunca deixa dado do usuário anterior
      return;
    }

    if (sessionStatus !== "authenticated" || hydratedForSession.current) return;
    hydratedForSession.current = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      setIsHydrating(true);
      try {
        await hydrateLocalDatabase(accessToken);
      } finally {
        setIsHydrating(false);
      }
    })();
  }, [sessionStatus]);

  const status: SyncStatus = !isOnline ? "OFFLINE" : isHydrating || pendingCount > 0 ? "SYNCING" : "SYNCED";

  return <SyncContext.Provider value={{ status, pendingCount }}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync precisa estar dentro de <SyncProvider>");
  }
  return ctx;
}
