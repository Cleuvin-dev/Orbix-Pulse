import type { Role } from "./role";

// Identidade resolvida pelo backend a partir do JWT do Supabase (docs/09-api.md, 9.2).
// Formato de resposta de GET /v1/auth/me — nunca inclui permissões cruas do
// cliente, tenant_id/role sempre vêm do banco (docs/02-arquitetura.md, 2.6).
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  tenantName: string;
  role: Role;
}
