import { apiClient } from "./client";

export interface Device {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  status: string;
}

export function listDevices() {
  return apiClient.get<Device[]>("/v1/devices");
}
