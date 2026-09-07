import type {
  CreateFinanceCategoryInput,
  CreateFinanceEntryInput,
  UpdateFinanceEntryInput,
} from "@orbix/validation";
import type { FinanceCategoryKind, FinanceEntryStatus, FinanceEntryType } from "@orbix/types";

import { apiClient } from "./client";
import type { PaginatedResult } from "./products";

// Espelham finance_categories/finance_entries (docs/03-modelo-dados.md, 3.3).
// amount é inteiro em centavos (CLAUDE.md regra 9).
export interface FinanceCategory {
  id: string;
  tenantId: string;
  name: string;
  kind: FinanceCategoryKind;
}

export interface FinanceEntry {
  id: string;
  tenantId: string;
  type: FinanceEntryType;
  categoryId: string;
  category: FinanceCategory;
  description: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: FinanceEntryStatus;
  referenceId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListFinanceEntriesParams {
  type?: FinanceEntryType;
  status?: FinanceEntryStatus;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export function listFinanceEntries(params: ListFinanceEntriesParams = {}) {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 50));
  return apiClient.get<PaginatedResult<FinanceEntry>>(`/v1/finance/entries?${query.toString()}`);
}

export function createFinanceEntry(input: CreateFinanceEntryInput) {
  return apiClient.post<FinanceEntry>("/v1/finance/entries", input);
}

export function updateFinanceEntry(id: string, input: UpdateFinanceEntryInput) {
  return apiClient.patch<FinanceEntry>(`/v1/finance/entries/${id}`, input);
}

export function markFinanceEntryPaid(id: string) {
  return apiClient.post<FinanceEntry>(`/v1/finance/entries/${id}/pay`, {});
}

export function cancelFinanceEntry(id: string) {
  return apiClient.post<FinanceEntry>(`/v1/finance/entries/${id}/cancel`, {});
}

export function deleteFinanceEntry(id: string) {
  return apiClient.delete<void>(`/v1/finance/entries/${id}`);
}

export function listFinanceCategories() {
  return apiClient.get<FinanceCategory[]>("/v1/finance-categories");
}

export function createFinanceCategory(input: CreateFinanceCategoryInput) {
  return apiClient.post<FinanceCategory>("/v1/finance-categories", input);
}

// GET /v1/finance/cash-flow e /v1/finance/dre (docs/09-api.md, 9.4) — sempre
// leitura agregada, nunca tabela própria (docs/04-regras-negocio.md, 4.6).
export interface CashFlowReport {
  from: string;
  to: string;
  inflow: number;
  outflow: number;
  net: number;
  breakdown: {
    salesInflow: number;
    receivablesInflow: number;
    payablesOutflow: number;
  };
}

export interface DreReport {
  from: string;
  to: string;
  grossRevenue: number;
  taxes: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingProfit: number;
}

export function getCashFlow(from: string, to: string) {
  const query = new URLSearchParams({ from, to });
  return apiClient.get<CashFlowReport>(`/v1/finance/cash-flow?${query.toString()}`);
}

export function getDre(from: string, to: string) {
  const query = new URLSearchParams({ from, to });
  return apiClient.get<DreReport>(`/v1/finance/dre?${query.toString()}`);
}
