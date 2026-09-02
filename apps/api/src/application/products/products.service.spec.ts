import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { ProductsService } from "./products.service";

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";

function skuConflictError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.22.0",
  });
}

describe("ProductsService", () => {
  let productFindFirst: ReturnType<typeof vi.fn>;
  let productCreate: ReturnType<typeof vi.fn>;
  let productUpdate: ReturnType<typeof vi.fn>;
  let categoryFindFirst: ReturnType<typeof vi.fn>;
  let supplierFindFirst: ReturnType<typeof vi.fn>;
  let barcodeCreate: ReturnType<typeof vi.fn>;
  let barcodeFindFirst: ReturnType<typeof vi.fn>;
  let barcodeUpdate: ReturnType<typeof vi.fn>;
  let service: ProductsService;

  beforeEach(() => {
    productFindFirst = vi.fn();
    productCreate = vi.fn();
    productUpdate = vi.fn();
    categoryFindFirst = vi.fn();
    supplierFindFirst = vi.fn();
    barcodeCreate = vi.fn();
    barcodeFindFirst = vi.fn();
    barcodeUpdate = vi.fn();

    const prisma = {
      product: {
        findFirst: productFindFirst,
        create: productCreate,
        update: productUpdate,
        findMany: vi.fn(),
        count: vi.fn(),
      },
      productCategory: { findFirst: categoryFindFirst },
      supplier: { findFirst: supplierFindFirst },
      barcode: { create: barcodeCreate, findFirst: barcodeFindFirst, update: barcodeUpdate },
    } as unknown as PrismaService;

    service = new ProductsService(prisma);
  });

  const baseInput = {
    sku: "SKU-1",
    name: "Refrigerante 2L",
    unit: "un",
    costPrice: 500,
    salePrice: 900,
  };

  it("cria produto sem categoria/fornecedor", async () => {
    productCreate.mockResolvedValue({ id: "prod-1", ...baseInput });

    await service.create(TENANT_ID, USER_ID, baseInput);

    expect(categoryFindFirst).not.toHaveBeenCalled();
    expect(supplierFindFirst).not.toHaveBeenCalled();
    expect(productCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: TENANT_ID, createdBy: USER_ID, sku: "SKU-1" }),
      }),
    );
  });

  it("rejeita categoryId que não pertence ao tenant", async () => {
    categoryFindFirst.mockResolvedValue(null);

    await expect(service.create(TENANT_ID, USER_ID, { ...baseInput, categoryId: "cat-outro-tenant" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(productCreate).not.toHaveBeenCalled();
  });

  it("rejeita supplierId que não pertence ao tenant", async () => {
    supplierFindFirst.mockResolvedValue(null);

    await expect(service.create(TENANT_ID, USER_ID, { ...baseInput, supplierId: "sup-outro-tenant" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("traduz violação de SKU duplicado em ConflictException", async () => {
    productCreate.mockRejectedValue(skuConflictError());

    await expect(service.create(TENANT_ID, USER_ID, baseInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it("nunca aceita current_stock no payload de criação (cache derivado, não é input)", async () => {
    productCreate.mockResolvedValue({ id: "prod-1" });

    await service.create(TENANT_ID, USER_ID, baseInput);

    const dataArg = productCreate.mock.calls[0]?.[0].data;
    expect(dataArg).not.toHaveProperty("currentStock");
  });

  it("update lança NotFoundException se o produto não existe no tenant", async () => {
    productFindFirst.mockResolvedValue(null);

    await expect(service.update(TENANT_ID, "prod-inexistente", { name: "X" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("addBarcode traduz código duplicado em ConflictException", async () => {
    productFindFirst.mockResolvedValue({ id: "prod-1" });
    barcodeCreate.mockRejectedValue(skuConflictError());

    await expect(service.addBarcode(TENANT_ID, "prod-1", { code: "789123", type: "EAN13" })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("removeBarcode lança NotFoundException se o código não existe/não pertence ao produto", async () => {
    barcodeFindFirst.mockResolvedValue(null);

    await expect(service.removeBarcode(TENANT_ID, "prod-1", "barcode-inexistente")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(barcodeUpdate).not.toHaveBeenCalled();
  });

  it("removeBarcode faz soft delete (deletedAt), nunca remove fisicamente", async () => {
    barcodeFindFirst.mockResolvedValue({ id: "barcode-1" });

    await service.removeBarcode(TENANT_ID, "prod-1", "barcode-1");

    expect(barcodeUpdate).toHaveBeenCalledWith({
      where: { id: "barcode-1" },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
