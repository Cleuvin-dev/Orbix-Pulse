import { apiClient } from "./client";

export interface Device {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  appVersion: string | null;
  lastSyncAt: string | null;
  status: string;
}

export function listDevices(options: { includeInactive?: boolean } = {}) {
  const query = options.includeInactive ? "?includeInactive=true" : "";
  return apiClient.get<Device[]>(`/v1/devices${query}`);
}
