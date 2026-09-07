import type { CreateSupplierInput, UpdateSupplierInput } from "@orbix/validation";

import { apiClient } from "./client";

// Espelha `suppliers` (docs/03-modelo-dados.md, 3.3).
export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

export function listSuppliers() {
  return apiClient.get<Supplier[]>("/v1/suppliers");
}

export function createSupplier(input: CreateSupplierInput) {
  return apiClient.post<Supplier>("/v1/suppliers", input);
}

export function updateSupplier(id: string, input: UpdateSupplierInput) {
  return apiClient.patch<Supplier>(`/v1/suppliers/${id}`, input);
}

export function deleteSupplier(id: string) {
  return apiClient.delete<void>(`/v1/suppliers/${id}`);
}
