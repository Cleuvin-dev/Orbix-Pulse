"use client";

import { cn } from "@orbix/ui";

import { useSync, type SyncStatus } from "@/lib/sync";

// Elemento de UI obrigatório e permanente (docs/06-offline-first.md, 6.6) —
// reflete o SyncProvider real (Fase 8): navigator.onLine + fila local do
// Dexie. A fila fica sempre vazia até o Sync Engine (Fase 9) existir de
// verdade e passar a escrever operações nela a partir de ações offline.
const STATE_CONFIG: Record<SyncStatus, { label: (pending: number) => string; dot: string }> = {
  SYNCED: { label: () => "Sincronizado", dot: "bg-pulse-online" },
  SYNCING: { label: () => "Sincronizando...", dot: "bg-pulse-syncing animate-pulse" },
  OFFLINE: {
    label: (pending) => `Offline — ${pending} operações aguardando conexão`,
    dot: "bg-pulse-offline",
  },
};

export function SyncStatusIndicator() {
  const { status, pendingCount } = useSync();
  const config = STATE_CONFIG[status];

  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground">
      <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      <span>{config.label(pendingCount)}</span>
    </div>
  );
}
