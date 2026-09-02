import type { CreateStockMovementInput, ReconcileStockInput } from "@orbix/validation";
import type { StockMovementType } from "@orbix/types";

import { apiClient } from "./client";
import type { PaginatedResult } from "./products";

// Espelha stock_movements (docs/03-modelo-dados.md, 3.3). quantity é Decimal
// no banco -> serializa como string no JSON, igual current_stock em Product.
export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  branchId: string;
  type: StockMovementType;
  quantity: string;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface StockAlert {
  id: string;
  sku: string;
  name: string;
  currentStock: string;
  minimumStock: string;
}

export interface ListMovementsParams {
  productId?: string;
  page?: number;
  pageSize?: number;
}

export function listStockMovements(params: ListMovementsParams = {}) {
  const query = new URLSearchParams();
  if (params.productId) query.set("productId", params.productId);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));
  return apiClient.get<PaginatedResult<StockMovement>>(`/v1/stock/movements?${query.toString()}`);
}

export function createStockMovement(input: CreateStockMovementInput) {
  return apiClient.post<StockMovement>("/v1/stock/movements", input);
}

export function reconcileStock(input: ReconcileStockInput) {
  return apiClient.post<StockMovement>("/v1/stock/reconciliation", input);
}

export function listStockAlerts() {
  return apiClient.get<StockAlert[]>("/v1/stock/alerts");
}
