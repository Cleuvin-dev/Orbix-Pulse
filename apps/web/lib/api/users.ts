import type { Role, UserStatus } from "@orbix/types";

import { apiClient } from "./client";

// GET /v1/users (docs/12-roadmap-fases.md, Fase 2 — "listar os usuários reais
// do tenant via API é trabalho futuro", sinalizado desde então).
export interface TenantUser {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: Role;
}

export function listUsers() {
  return apiClient.get<TenantUser[]>("/v1/users");
}

export function updateUserRole(id: string, role: Role) {
  return apiClient.patch<TenantUser>(`/v1/users/${id}/role`, { role });
}
