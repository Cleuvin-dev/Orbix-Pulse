import type { CurrentUser } from "@orbix/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { CanPerformService } from "./can-perform.service";

const user: CurrentUser = {
  id: "user-1",
  email: "manager@orbixpulse.dev",
  name: "Usuário MANAGER",
  tenantId: "tenant-1",
  tenantName: "Empresa Teste",
  role: "MANAGER",
};

describe("CanPerformService", () => {
  let findUniqueRolePermission: ReturnType<typeof vi.fn>;
  let findUniqueOverride: ReturnType<typeof vi.fn>;
  let service: CanPerformService;

  beforeEach(() => {
    findUniqueRolePermission = vi.fn();
    findUniqueOverride = vi.fn();
    const prisma = {
      rolePermission: { findUnique: findUniqueRolePermission },
      userPermissionOverride: { findUnique: findUniqueOverride },
    } as unknown as PrismaService;
    service = new CanPerformService(prisma);
  });

  it("nega por padrão quando não há role_permission nem override (fail-closed)", async () => {
    findUniqueOverride.mockResolvedValue(null);
    findUniqueRolePermission.mockResolvedValue(null);

    await expect(service.check(user, "sales.create")).resolves.toBe(false);
  });

  it("concede quando existe role_permission com granted=true", async () => {
    findUniqueOverride.mockResolvedValue(null);
    findUniqueRolePermission.mockResolvedValue({ granted: true, deletedAt: null });

    await expect(service.check(user, "sales.create")).resolves.toBe(true);
  });

  it("nega quando o role_permission existe mas granted=false", async () => {
    findUniqueOverride.mockResolvedValue(null);
    findUniqueRolePermission.mockResolvedValue({ granted: false, deletedAt: null });

    await expect(service.check(user, "users.manage")).resolves.toBe(false);
  });

  it("ignora role_permission logicamente excluído (trata como ausente)", async () => {
    findUniqueOverride.mockResolvedValue(null);
    findUniqueRolePermission.mockResolvedValue({ granted: true, deletedAt: new Date() });

    await expect(service.check(user, "sales.create")).resolves.toBe(false);
  });

  it("override por usuário tem prioridade sobre a permissão do role (concede)", async () => {
    findUniqueOverride.mockResolvedValue({ granted: true, deletedAt: null });
    findUniqueRolePermission.mockResolvedValue({ granted: false, deletedAt: null });

    await expect(service.check(user, "users.manage")).resolves.toBe(true);
  });

  it("override por usuário tem prioridade sobre a permissão do role (revoga)", async () => {
    findUniqueOverride.mockResolvedValue({ granted: false, deletedAt: null });
    findUniqueRolePermission.mockResolvedValue({ granted: true, deletedAt: null });

    await expect(service.check(user, "sales.create")).resolves.toBe(false);
  });

  it("ignora override logicamente excluído e cai para a permissão do role", async () => {
    findUniqueOverride.mockResolvedValue({ granted: true, deletedAt: new Date() });
    findUniqueRolePermission.mockResolvedValue({ granted: true, deletedAt: null });

    await expect(service.check(user, "sales.create")).resolves.toBe(true);
  });
});
