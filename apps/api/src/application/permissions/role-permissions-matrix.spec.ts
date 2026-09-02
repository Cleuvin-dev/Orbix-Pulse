import { ROLES, type CurrentUser, type Role } from "@orbix/types";
import { describe, expect, it } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { CanPerformService } from "./can-perform.service";
import { DEFAULT_ROLE_PERMISSIONS } from "./default-role-permissions";

// Matriz completa de permissões por role, exigida por docs/10-testes.md (10.3:
// "Given: usuário com role CASHIER, When: GET /finance/dre, Then: 403" — aqui
// generalizado pra toda a matriz de docs/05-permissoes-rbac.md, 5.4, em vez de
// só o caso financeiro). Sem banco de testes isolado configurado ainda
// (docs/10-testes.md, 10.6 — fica pra quando essa infra existir); o Prisma é
// mockado devolvendo exatamente os dados que o seed grava, então isso cobre a
// lógica de CanPerformService fielmente ao que roda em produção.
const ALL_PERMISSIONS = [...new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat())].sort();

function buildUser(role: Role): CurrentUser {
  return {
    id: "user-1",
    email: `${role.toLowerCase()}@orbixpulse.dev`,
    name: `Usuário ${role}`,
    tenantId: "tenant-1",
    tenantName: "Empresa Teste",
    role,
  };
}

function buildService(role: Role): CanPerformService {
  const prisma = {
    userPermissionOverride: { findUnique: async () => null },
    rolePermission: {
      findUnique: async ({ where }: { where: { tenantId_role_permission: { permission: string } } }) => {
        const permission = where.tenantId_role_permission.permission;
        const granted = DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
        return granted ? { granted: true, deletedAt: null } : null;
      },
    },
  } as unknown as PrismaService;
  return new CanPerformService(prisma);
}

describe("Matriz completa de permissões por role (docs/05-permissoes-rbac.md, 5.4)", () => {
  for (const role of ROLES) {
    const service = buildService(role);
    const user = buildUser(role);

    for (const permission of ALL_PERMISSIONS) {
      const expected = DEFAULT_ROLE_PERMISSIONS[role].includes(permission);
      it(`${role} ${expected ? "PODE" : "NÃO pode"} "${permission}"`, async () => {
        await expect(service.check(user, permission)).resolves.toBe(expected);
      });
    }
  }

  it("caso do blueprint (docs/10-testes.md, 10.3): CASHIER não vê lucro", async () => {
    const service = buildService("CASHIER");
    await expect(service.check(buildUser("CASHIER"), "finance.view_profit")).resolves.toBe(false);
  });
});
