import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import type { SupabaseAuthUser } from "../../infrastructure/auth/supabase.service";
import { ResolveCurrentUserService } from "./resolve-current-user.service";

const authUser: SupabaseAuthUser = { id: "auth-uuid-1", email: "owner@orbixpulse.dev" };

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    email: "owner@orbixpulse.dev",
    name: "Usuário OWNER",
    status: "ACTIVE",
    deletedAt: null,
    roles: [
      {
        tenantId: "tenant-1",
        role: "OWNER",
        tenant: { name: "Empresa Teste", status: "ACTIVE", deletedAt: null },
      },
    ],
    ...overrides,
  };
}

describe("ResolveCurrentUserService", () => {
  let findUnique: ReturnType<typeof vi.fn>;
  let service: ResolveCurrentUserService;

  beforeEach(() => {
    findUnique = vi.fn();
    const prisma = { user: { findUnique } } as unknown as PrismaService;
    service = new ResolveCurrentUserService(prisma);
  });

  it("rejeita quando não existe usuário local vinculado ao auth_id", async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.resolve(authUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejeita usuário logicamente excluído (deleted_at)", async () => {
    findUnique.mockResolvedValue(buildUser({ deletedAt: new Date() }));

    await expect(service.resolve(authUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejeita usuário inativo", async () => {
    findUnique.mockResolvedValue(buildUser({ status: "INACTIVE" }));

    await expect(service.resolve(authUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("resolve tenant/role automaticamente quando o usuário tem só um tenant ativo", async () => {
    findUnique.mockResolvedValue(buildUser());

    const result = await service.resolve(authUser);

    expect(result).toEqual({
      id: "user-1",
      email: "owner@orbixpulse.dev",
      name: "Usuário OWNER",
      tenantId: "tenant-1",
      tenantName: "Empresa Teste",
      role: "OWNER",
    });
  });

  it("ignora vínculos com tenant inativo/excluído ao contar tenants ativos", async () => {
    findUnique.mockResolvedValue(
      buildUser({
        roles: [
          {
            tenantId: "tenant-1",
            role: "OWNER",
            tenant: { name: "Empresa Teste", status: "ACTIVE", deletedAt: null },
          },
          {
            tenantId: "tenant-2",
            role: "SELLER",
            tenant: { name: "Outra Empresa", status: "SUSPENDED", deletedAt: null },
          },
        ],
      }),
    );

    const result = await service.resolve(authUser);

    expect(result.tenantId).toBe("tenant-1");
  });

  it("rejeita quando o usuário não tem nenhum tenant ativo", async () => {
    findUnique.mockResolvedValue(buildUser({ roles: [] }));

    await expect(service.resolve(authUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("exige X-Tenant-Id quando o usuário tem mais de um tenant ativo", async () => {
    findUnique.mockResolvedValue(
      buildUser({
        roles: [
          {
            tenantId: "tenant-1",
            role: "OWNER",
            tenant: { name: "Empresa Teste", status: "ACTIVE", deletedAt: null },
          },
          {
            tenantId: "tenant-2",
            role: "MANAGER",
            tenant: { name: "Outra Empresa", status: "ACTIVE", deletedAt: null },
          },
        ],
      }),
    );

    await expect(service.resolve(authUser)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("usa o tenant do header X-Tenant-Id quando informado e válido", async () => {
    findUnique.mockResolvedValue(
      buildUser({
        roles: [
          {
            tenantId: "tenant-1",
            role: "OWNER",
            tenant: { name: "Empresa Teste", status: "ACTIVE", deletedAt: null },
          },
          {
            tenantId: "tenant-2",
            role: "MANAGER",
            tenant: { name: "Outra Empresa", status: "ACTIVE", deletedAt: null },
          },
        ],
      }),
    );

    const result = await service.resolve(authUser, "tenant-2");

    expect(result.tenantId).toBe("tenant-2");
    expect(result.role).toBe("MANAGER");
  });

  it("rejeita X-Tenant-Id que o usuário não tem acesso", async () => {
    findUnique.mockResolvedValue(buildUser());

    await expect(service.resolve(authUser, "tenant-outro")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
