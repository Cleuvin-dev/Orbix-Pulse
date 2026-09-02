import type { CloseCashRegisterInput, OpenCashRegisterInput } from "@orbix/validation";

import { apiClient } from "./client";

export interface CashRegister {
  id: string;
  tenantId: string;
  branchId: string;
  openedBy: string;
  openedAt: string;
  openingAmount: number;
  closedBy: string | null;
  closedAt: string | null;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  status: "OPEN" | "CLOSED";
}

export function currentCashRegister() {
  return apiClient.get<CashRegister | null>("/v1/cash-registers/current");
}

export function openCashRegister(input: OpenCashRegisterInput) {
  return apiClient.post<CashRegister>("/v1/cash-registers/open", input);
}

export function closeCashRegister(id: string, input: CloseCashRegisterInput) {
  return apiClient.post<CashRegister>(`/v1/cash-registers/${id}/close`, input);
}
