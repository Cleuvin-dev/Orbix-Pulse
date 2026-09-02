import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { ProductCategoriesService } from "./product-categories.service";

const TENANT_ID = "tenant-1";

describe("ProductCategoriesService", () => {
  let findFirst: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let service: ProductCategoriesService;

  beforeEach(() => {
    findFirst = vi.fn();
    create = vi.fn();
    update = vi.fn();
    const prisma = {
      productCategory: { findFirst, create, update, findMany: vi.fn() },
    } as unknown as PrismaService;
    service = new ProductCategoriesService(prisma);
  });

  it("cria categoria sem pai", async () => {
    create.mockResolvedValue({ id: "cat-1", name: "Bebidas" });

    await service.create(TENANT_ID, { name: "Bebidas" });

    expect(create).toHaveBeenCalledWith({
      data: { tenantId: TENANT_ID, name: "Bebidas", parentId: null },
    });
  });

  it("rejeita criar categoria com parentId de outro tenant / inexistente", async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.create(TENANT_ID, { name: "Refrigerantes", parentId: "cat-outro-tenant" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejeita categoria ser pai dela mesma no update", async () => {
    findFirst.mockResolvedValue({ id: "cat-1", parentId: null });

    await expect(service.update(TENANT_ID, "cat-1", { parentId: "cat-1" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejeita ciclo na hierarquia (A -> B -> A)", async () => {
    // cat-1 (buscar por id, existe) -> tenta virar filho de cat-2
    // cat-2.parentId = cat-1 (cat-2 já é filho de cat-1) -> criaria ciclo
    findFirst.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "cat-1") return Promise.resolve({ id: "cat-1", parentId: null });
      if (where.id === "cat-2") return Promise.resolve({ id: "cat-2", parentId: "cat-1" });
      return Promise.resolve(null);
    });

    await expect(service.update(TENANT_ID, "cat-1", { parentId: "cat-2" })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("permite trocar de pai quando não há ciclo", async () => {
    findFirst.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "cat-1") return Promise.resolve({ id: "cat-1", parentId: null });
      if (where.id === "cat-3") return Promise.resolve({ id: "cat-3", parentId: null });
      return Promise.resolve(null);
    });
    update.mockResolvedValue({ id: "cat-1", parentId: "cat-3" });

    await service.update(TENANT_ID, "cat-1", { name: "Bebidas", parentId: "cat-3" });

    expect(update).toHaveBeenCalledWith({ where: { id: "cat-1" }, data: { name: "Bebidas", parentId: "cat-3" } });
  });

  it("lança NotFoundException ao remover categoria inexistente", async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.remove(TENANT_ID, "cat-inexistente")).rejects.toBeInstanceOf(NotFoundException);
  });
});
