import { apiClient } from "./client";

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

export function listBranches() {
  return apiClient.get<Branch[]>("/v1/branches");
}
