import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { SuppliersService } from "./suppliers.service";

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";

describe("SuppliersService", () => {
  it("list: lista fornecedores do tenant, ignorando apagados, ordenados por nome", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "s1", name: "Fornecedor A" }]);
    const prisma = { supplier: { findMany } } as unknown as PrismaService;
    const service = new SuppliersService(prisma);

    const result = await service.list(TENANT_ID);

    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, deletedAt: null },
      orderBy: { name: "asc" },
    });
    expect(result).toEqual([{ id: "s1", name: "Fornecedor A" }]);
  });

  it("create: aplica isActive=true por padrão quando não informado", async () => {
    const create = vi.fn().mockResolvedValue({ id: "s1" });
    const prisma = { supplier: { create } } as unknown as PrismaService;
    const service = new SuppliersService(prisma);

    await service.create(TENANT_ID, USER_ID, { name: "Novo Fornecedor" });

    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: TENANT_ID,
        name: "Novo Fornecedor",
        document: null,
        email: null,
        phone: null,
        address: null,
        isActive: true,
        createdBy: USER_ID,
      },
    });
  });

  it("remove: soft delete via deletedAt, nunca DELETE físico", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "s1" });
    const update = vi.fn().mockResolvedValue({});
    const prisma = { supplier: { findFirst, update } } as unknown as PrismaService;
    const service = new SuppliersService(prisma);

    await service.remove(TENANT_ID, "s1");

    expect(update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { deletedAt: expect.any(Date) } });
  });

  it("update: fornecedor de outro tenant (ou apagado) lança 404", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = { supplier: { findFirst } } as unknown as PrismaService;
    const service = new SuppliersService(prisma);

    await expect(service.update(TENANT_ID, "s1", { name: "X" })).rejects.toThrow(
      "Fornecedor não encontrado.",
    );
  });
});
