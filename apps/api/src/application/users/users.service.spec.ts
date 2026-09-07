import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { UsersService } from "./users.service";

const TENANT_ID = "tenant-1";
const ACTING_USER_ID = "acting-user";

describe("UsersService", () => {
  it("list: retorna nome/e-mail/role de cada usuário do tenant, ignorando vínculos apagados", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        role: "SELLER",
        user: { id: "u1", name: "Ana", email: "ana@teste.dev", status: "ACTIVE" },
      },
    ]);
    const prisma = { userRole: { findMany } } as unknown as PrismaService;
    const service = new UsersService(prisma);

    const result = await service.list(TENANT_ID);

    expect(result).toEqual([{ id: "u1", name: "Ana", email: "ana@teste.dev", status: "ACTIVE", role: "SELLER" }]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null, user: { deletedAt: null } },
      }),
    );
  });

  it("updateRole: troca o role e grava audit_log com antes/depois", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "ur1", role: "SELLER" });
    const update = vi.fn().mockResolvedValue({ id: "ur1", role: "MANAGER" });
    const auditLogCreate = vi.fn().mockResolvedValue({});
    const prisma = {
      userRole: { findFirst, update },
      auditLog: { create: auditLogCreate },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);

    const result = await service.updateRole(TENANT_ID, ACTING_USER_ID, "target-user", "MANAGER");

    expect(result).toEqual({ id: "ur1", role: "MANAGER" });
    expect(update).toHaveBeenCalledWith({ where: { id: "ur1" }, data: { role: "MANAGER" } });
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: {
        tenantId: TENANT_ID,
        userId: ACTING_USER_ID,
        action: "USER_ROLE_CHANGED",
        entity: "user",
        entityId: "target-user",
        before: { role: "SELLER" },
        after: { role: "MANAGER" },
      },
    });
  });

  it("updateRole: bloqueia trocar o role de quem hoje é OWNER", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "ur1", role: "OWNER" });
    const prisma = { userRole: { findFirst } } as unknown as PrismaService;
    const service = new UsersService(prisma);

    await expect(service.updateRole(TENANT_ID, ACTING_USER_ID, "target-user", "MANAGER")).rejects.toThrow(
      "O papel de OWNER não pode ser alterado.",
    );
  });

  it("updateRole: repetir o mesmo role é idempotente (não grava audit_log de novo)", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "ur1", role: "MANAGER" });
    const update = vi.fn();
    const auditLogCreate = vi.fn();
    const prisma = {
      userRole: { findFirst, update },
      auditLog: { create: auditLogCreate },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);

    const result = await service.updateRole(TENANT_ID, ACTING_USER_ID, "target-user", "MANAGER");

    expect(result).toEqual({ id: "ur1", role: "MANAGER" });
    expect(update).not.toHaveBeenCalled();
    expect(auditLogCreate).not.toHaveBeenCalled();
  });

  it("updateRole: usuário não encontrado no tenant lança 404", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = { userRole: { findFirst } } as unknown as PrismaService;
    const service = new UsersService(prisma);

    await expect(service.updateRole(TENANT_ID, ACTING_USER_ID, "target-user", "MANAGER")).rejects.toThrow(
      "Usuário não encontrado neste tenant.",
    );
  });
});
