import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { FinanceCategoriesService } from "./finance-categories.service";

const TENANT_ID = "tenant-1";

describe("FinanceCategoriesService", () => {
  let findFirst: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let service: FinanceCategoriesService;

  beforeEach(() => {
    findFirst = vi.fn().mockResolvedValue({ id: "cat-1", tenantId: TENANT_ID });
    create = vi.fn();
    update = vi.fn();

    const prisma = {
      financeCategory: { findFirst, create, update, findMany: vi.fn() },
    } as unknown as PrismaService;

    service = new FinanceCategoriesService(prisma);
  });

  it("cria categoria com kind", async () => {
    await service.create(TENANT_ID, { name: "Aluguel", kind: "EXPENSE" });

    expect(create).toHaveBeenCalledWith({ data: { tenantId: TENANT_ID, name: "Aluguel", kind: "EXPENSE" } });
  });

  it("rejeita remover categoria inexistente", async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.remove(TENANT_ID, "cat-inexistente")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("remove faz soft delete", async () => {
    await service.remove(TENANT_ID, "cat-1");

    expect(update).toHaveBeenCalledWith({ where: { id: "cat-1" }, data: { deletedAt: expect.any(Date) } });
  });
});
