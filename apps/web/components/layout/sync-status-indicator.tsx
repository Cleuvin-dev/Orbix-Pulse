"use client";

import { cn } from "@orbix/ui";
import { useState } from "react";

// Elemento de UI obrigatório e permanente (docs/06-offline-first.md, 6.6).
// MOCK: o estado é fixo/cicla ao clicar só para visualização — a conexão real
// com a fila de sincronização acontece nas Fases 8/9 (Dexie + Sync Engine).
type SyncState = "SYNCED" | "SYNCING" | "OFFLINE";

const STATE_CONFIG: Record<SyncState, { label: string; dot: string; text: string }> = {
  SYNCED: { label: "Sincronizado", dot: "bg-pulse-online", text: "text-foreground" },
  SYNCING: { label: "Sincronizando...", dot: "bg-pulse-syncing animate-pulse", text: "text-foreground" },
  OFFLINE: { label: "Offline — 3 operações aguardando conexão", dot: "bg-pulse-offline", text: "text-foreground" },
};

const CYCLE: SyncState[] = ["SYNCED", "SYNCING", "OFFLINE"];

export function SyncStatusIndicator() {
  const [state, setState] = useState<SyncState>("SYNCED");
  const config = STATE_CONFIG[state];

  return (
    <button
      type="button"
      onClick={() => setState((current) => CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length]!)}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
      title="Mock — clique para pré-visualizar os outros estados"
    >
      <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      <span className={config.text}>{config.label}</span>
    </button>
  );
}
