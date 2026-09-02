import { ROLES, type Role } from "@orbix/types";

import { ROLE_LABELS } from "./role-labels";

// Dado de demonstração para a tela de Usuários e Permissões — não é sessão real
// (essa vem de @/lib/session). Espelha apps/api/prisma/seed.ts. Listagem real de
// usuários do tenant fica para quando essa tela for ligada à API (fora do escopo
// da Fase 2 — só Auth).
export interface DemoUser {
  role: Role;
  name: string;
  email: string;
  branchName: string;
}

export const DEMO_USERS: Record<Role, DemoUser> = Object.fromEntries(
  ROLES.map((role) => [
    role,
    {
      role,
      name: `Usuário ${ROLE_LABELS[role]}`,
      email: `${role.toLowerCase()}@orbixpulse.dev`,
      branchName: "Loja Matriz",
    } satisfies DemoUser,
  ]),
) as Record<Role, DemoUser>;
