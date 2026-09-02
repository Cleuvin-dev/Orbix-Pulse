import type { CreateSaleInput } from "@orbix/validation";
import type { PaymentMethod } from "@orbix/types";

import { apiClient } from "./client";

export interface SaleItem {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id: string;
  tenantId: string;
  branchId: string;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
  discountAmount: number;
  cashRegisterId: string | null;
  createdAt: string;
  items: SaleItem[];
  payments: Payment[];
}

export function createSale(input: CreateSaleInput) {
  return apiClient.post<Sale>("/v1/sales", input);
}
