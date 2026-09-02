import type { PaymentMethod, StockMovementType } from "@orbix/types";
import Dexie, { type EntityTable } from "dexie";

// Banco local (docs/06-offline-first.md, 6.5) — só o subconjunto de
// entidades que o usuário logado tem permissão de ver (6.4, sincronização
// seletiva), nunca o banco inteiro do tenant. Formas espelham a resposta da
// API (apps/api), não o schema Prisma — não há tipos gerados compartilhados
// pra isso ainda.

export interface LocalProduct {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: string; // Decimal serializado como string pela API
  minimumStock: string | null;
  maximumStock: string | null;
  isActive: boolean;
}

export interface LocalCustomer {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
}

export interface LocalSupplier {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
}

export interface LocalSale {
  id: string;
  branchId: string;
  customerId: string | null;
  status: string;
  totalAmount: number;
  discountAmount: number;
  cashRegisterId: string | null;
  createdAt: string;
}

export interface LocalSaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: string;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface LocalStockMovement {
  id: string;
  productId: string;
  branchId: string;
  type: StockMovementType;
  quantity: string;
  reason: string | null;
  createdAt: string;
}

export interface LocalPayment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
  status: string;
}

export interface LocalCashRegister {
  id: string;
  branchId: string;
  openedBy: string;
  openedAt: string;
  openingAmount: number;
  status: string;
  closedAt: string | null;
  closingAmount: number | null;
}

// Fila de operações pendentes de envio (docs/06-offline-first.md, 6.5;
// docs/07-sync-engine.md, 7.2) — vazia até o Sync Engine real (Fase 9)
// escrever operações aqui a partir de ações feitas offline. O status
// SYNCING/SYNCED/CONFLICT segue a máquina de estados de 07-sync-engine.md (7.3).
export interface SyncQueueItem {
  id: string; // == operation_id
  entity: string;
  payload: unknown;
  status: "PENDING" | "SYNCING" | "SYNCED" | "SYNC_ERROR";
  createdAt: string;
}

export interface AppMetadataEntry {
  key: string;
  value: string;
}

class OrbixLocalDatabase extends Dexie {
  products!: EntityTable<LocalProduct, "id">;
  customers!: EntityTable<LocalCustomer, "id">;
  suppliers!: EntityTable<LocalSupplier, "id">;
  sales!: EntityTable<LocalSale, "id">;
  saleItems!: EntityTable<LocalSaleItem, "id">;
  stockMovements!: EntityTable<LocalStockMovement, "id">;
  payments!: EntityTable<LocalPayment, "id">;
  cashRegisters!: EntityTable<LocalCashRegister, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;
  appMetadata!: EntityTable<AppMetadataEntry, "key">;

  constructor() {
    super("orbix-pulse");
    this.version(1).stores({
      products: "id, categoryId, sku",
      customers: "id",
      suppliers: "id",
      sales: "id, cashRegisterId, status, createdAt",
      saleItems: "id, saleId, productId",
      stockMovements: "id, productId, createdAt",
      payments: "id, saleId",
      cashRegisters: "id, status",
      syncQueue: "id, status, createdAt",
      appMetadata: "key",
    });
  }
}

// Uma instância só por aba/origem — Dexie já lida com abrir a conexão sob
// demanda (não toca em IndexedDB só por importar este módulo, então é seguro
// mesmo em contexto de build/SSR do Next.js, desde que só seja de fato usado
// a partir de client components).
export const db = new OrbixLocalDatabase();

// Limpa tudo ao deslogar (docs/06-offline-first.md, 6.4) — o dado local é
// específico do usuário/tenant logado; sem isso, um dispositivo compartilhado
// (ex: PC do caixa) manteria dado de negócio do usuário anterior visível
// depois da troca de conta.
export async function clearLocalDatabase() {
  await Promise.all([
    db.products.clear(),
    db.customers.clear(),
    db.suppliers.clear(),
    db.sales.clear(),
    db.saleItems.clear(),
    db.stockMovements.clear(),
    db.payments.clear(),
    db.cashRegisters.clear(),
    db.syncQueue.clear(),
    db.appMetadata.clear(),
  ]);
}
