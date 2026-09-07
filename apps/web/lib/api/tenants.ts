import type { UpdateTenantSettingsInput } from "@orbix/validation";

import { apiClient } from "./client";

// GET/PATCH /v1/tenants/me (docs/03-modelo-dados.md, 3.1 — tenant). settings é
// o JSON já lido por StockMovementsService/SalesService (allowNegativeStock,
// saleCancelWindowHours), mas nunca antes configurável por nenhuma tela.
export interface Tenant {
  id: string;
  name: string;
  document: string;
  plan: string;
  status: string;
  settings: {
    allowNegativeStock?: boolean;
    saleCancelWindowHours?: number;
  };
}

export function getCurrentTenant() {
  return apiClient.get<Tenant>("/v1/tenants/me");
}

export function updateTenantSettings(input: UpdateTenantSettingsInput) {
  return apiClient.patch<Tenant>("/v1/tenants/me/settings", input);
}
