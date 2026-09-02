import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CanPerformService } from "../../application/permissions/can-perform.service";
import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { PermissionGuard } from "./permission.guard";

const currentUser = {
  id: "user-1",
  email: "cashier@orbixpulse.dev",
  name: "Usuário CASHIER",
  tenantId: "tenant-1",
  tenantName: "Empresa Teste",
  role: "CASHIER" as const,
};

function buildContext(permission: string | undefined) {
  const request = { currentUser, path: "/v1/finance/dre", method: "GET", headers: {} };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => vi.fn(),
  } as unknown as ExecutionContext;
  const reflector = { get: vi.fn().mockReturnValue(permission) } as unknown as Reflector;
  return { context, reflector, request };
}

describe("PermissionGuard", () => {
  let check: ReturnType<typeof vi.fn>;
  let auditLogCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    check = vi.fn();
    auditLogCreate = vi.fn();
  });

  function buildGuard(reflector: Reflector) {
    const canPerform = { check } as unknown as CanPerformService;
    const prisma = { auditLog: { create: auditLogCreate } } as unknown as PrismaService;
    return new PermissionGuard(reflector, canPerform, prisma);
  }

  it("libera a rota quando não há @RequirePermission declarado", async () => {
    const { context, reflector } = buildContext(undefined);
    const guard = buildGuard(reflector);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(check).not.toHaveBeenCalled();
  });

  it("libera quando CanPerformService concede a permissão", async () => {
    check.mockResolvedValue(true);
    const { context, reflector } = buildContext("finance.view");
    const guard = buildGuard(reflector);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(auditLogCreate).not.toHaveBeenCalled();
  });

  it("nega e registra audit_log quando CanPerformService recusa", async () => {
    check.mockResolvedValue(false);
    const { context, reflector } = buildContext("finance.view_profit");
    const guard = buildGuard(reflector);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-1",
        userId: "user-1",
        action: "PERMISSION_DENIED",
        entity: "user",
        entityId: "user-1",
        after: { permission: "finance.view_profit", path: "/v1/finance/dre", method: "GET" },
      },
    });
  });
});
