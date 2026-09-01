// Espelha o enum Role de apps/api/prisma/schema.prisma (docs/05-permissoes-rbac.md, 5.2).
// Mantido em sincronia manualmente até existir geração automática de tipos a partir do schema.
export const ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "FINANCE",
  "CASHIER",
  "STOCK",
  "SELLER",
  "ACCOUNTANT",
] as const;

export type Role = (typeof ROLES)[number];
