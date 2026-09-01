import { ROLES, type Role } from "@orbix/types";

// MOCK — existe só para permitir construir/navegar o layout antes da Fase 2
// (Supabase Auth real) e Fase 3 (RBAC real). Nenhuma decisão de autorização
// deve depender disto: é puramente visual (docs/04-regras-negocio.md, 4.7).
// Espelha os usuários de apps/api/prisma/seed.ts.
export interface MockUser {
  role: Role;
  name: string;
  email: string;
  tenantName: string;
  branchName: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  FINANCE: "Financeiro",
  CASHIER: "Caixa",
  STOCK: "Estoquista",
  SELLER: "Vendedor",
  ACCOUNTANT: "Contador",
};

export const MOCK_USERS: Record<Role, MockUser> = Object.fromEntries(
  ROLES.map((role) => [
    role,
    {
      role,
      name: `Usuário ${ROLE_LABELS[role]}`,
      email: `${role.toLowerCase()}@orbixpulse.dev`,
      tenantName: "Empresa Teste",
      branchName: "Loja Matriz",
    } satisfies MockUser,
  ]),
) as Record<Role, MockUser>;
