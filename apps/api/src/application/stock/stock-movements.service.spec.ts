import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { StockMovementsService } from "./stock-movements.service";

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const PRODUCT_ID = "prod-1";
const BRANCH_ID = "branch-1";

function buildProduct(currentStock: number) {
  return { id: PRODUCT_ID, tenantId: TENANT_ID, currentStock: new Prisma.Decimal(currentStock) };
}

describe("StockMovementsService", () => {
  let movementFindUnique: ReturnType<typeof vi.fn>;
  let movementFindUniqueOrThrow: ReturnType<typeof vi.fn>;
  let movementCreate: ReturnType<typeof vi.fn>;
  let productFindFirst: ReturnType<typeof vi.fn>;
  let productUpdate: ReturnType<typeof vi.fn>;
  let branchFindFirst: ReturnType<typeof vi.fn>;
  let tenantFindUniqueOrThrow: ReturnType<typeof vi.fn>;
  let transaction: ReturnType<typeof vi.fn>;
  let service: StockMovementsService;

  beforeEach(() => {
    movementFindUnique = vi.fn().mockResolvedValue(null);
    movementFindUniqueOrThrow = vi.fn();
    movementCreate = vi.fn().mockReturnValue("create-op");
    productFindFirst = vi.fn().mockResolvedValue(buildProduct(10));
    productUpdate = vi.fn().mockReturnValue("update-op");
    branchFindFirst = vi.fn().mockResolvedValue({ id: BRANCH_ID, tenantId: TENANT_ID });
    tenantFindUniqueOrThrow = vi.fn().mockResolvedValue({ id: TENANT_ID, settings: {} });
    const tx = {
      tenant: { findUniqueOrThrow: tenantFindUniqueOrThrow },
      stockMovement: { create: movementCreate },
      product: { update: productUpdate },
    };
    transaction = vi.fn().mockImplementation((callback: (tx: unknown) => unknown) => callback(tx));

    const prisma = {
      stockMovement: {
        findUnique: movementFindUnique,
        findUniqueOrThrow: movementFindUniqueOrThrow,
        create: movementCreate,
        findMany: vi.fn(),
        count: vi.fn(),
      },
      product: { findFirst: productFindFirst, update: productUpdate, findMany: vi.fn() },
      branch: { findFirst: branchFindFirst },
      tenant: { findUniqueOrThrow: tenantFindUniqueOrThrow },
      $transaction: transaction,
    } as unknown as PrismaService;

    service = new StockMovementsService(prisma);
  });

  const baseInput = {
    operationId: "11111111-1111-1111-1111-111111111111",
    productId: PRODUCT_ID,
    branchId: BRANCH_ID,
    type: "ENTRADA" as const,
    quantity: 5,
    reason: "Compra recebida",
  };

  function lastCreatedQuantity(): Prisma.Decimal {
    const call = movementCreate.mock.calls.at(-1)?.[0] as { data: { quantity: Prisma.Decimal } };
    return call.data.quantity;
  }

  it("idempotência: retorna o movimento existente sem reprocessar", async () => {
    movementFindUnique.mockResolvedValue({ id: "movement-ja-existe" });

    const result = await service.createMovement(TENANT_ID, USER_ID, baseInput);

    expect(result).toEqual({ id: "movement-ja-existe" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejeita produto que não pertence ao tenant", async () => {
    productFindFirst.mockResolvedValue(null);

    await expect(service.createMovement(TENANT_ID, USER_ID, baseInput)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejeita filial que não pertence ao tenant", async () => {
    branchFindFirst.mockResolvedValue(null);

    await expect(service.createMovement(TENANT_ID, USER_ID, baseInput)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("ENTRADA aplica delta positivo igual à quantidade informada", async () => {
    await service.createMovement(TENANT_ID, USER_ID, { ...baseInput, type: "ENTRADA", quantity: 5 });

    expect(lastCreatedQuantity().toNumber()).toBe(5);
  });

  it("DEVOLUCAO aplica delta positivo", async () => {
    await service.createMovement(TENANT_ID, USER_ID, { ...baseInput, type: "DEVOLUCAO", quantity: 3 });

    expect(lastCreatedQuantity().toNumber()).toBe(3);
  });

  it("SAIDA aplica delta negativo", async () => {
    await service.createMovement(TENANT_ID, USER_ID, { ...baseInput, type: "SAIDA", quantity: 4 });

    expect(lastCreatedQuantity().toNumber()).toBe(-4);
  });

  it("TRANSFERENCIA aplica delta negativo", async () => {
    await service.createMovement(TENANT_ID, USER_ID, { ...baseInput, type: "TRANSFERENCIA", quantity: 2 });

    expect(lastCreatedQuantity().toNumber()).toBe(-2);
  });

  it("SAIDA maior que o estoque disponível é bloqueada sem allow_negative_stock", async () => {
    productFindFirst.mockResolvedValue(buildProduct(3));

    await expect(
      service.createMovement(TENANT_ID, USER_ID, { ...baseInput, type: "SAIDA", quantity: 10 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(movementCreate).not.toHaveBeenCalled();
  });

  it("SAIDA que deixaria negativo é permitida quando o tenant habilita allow_negative_stock", async () => {
    productFindFirst.mockResolvedValue(buildProduct(3));
    tenantFindUniqueOrThrow.mockResolvedValue({ id: TENANT_ID, settings: { allowNegativeStock: true } });

    await service.createMovement(TENANT_ID, USER_ID, { ...baseInput, type: "SAIDA", quantity: 10 });

    expect(transaction).toHaveBeenCalled();
  });

  it("SAIDA que não deixa o estoque negativo passa mesmo sem allow_negative_stock", async () => {
    productFindFirst.mockResolvedValue(buildProduct(10));

    await service.createMovement(TENANT_ID, USER_ID, { ...baseInput, type: "SAIDA", quantity: 4 });

    expect(transaction).toHaveBeenCalled();
  });

  it("reconcile calcula a diferença entre contagem física e o estoque atual (positiva)", async () => {
    productFindFirst.mockResolvedValue(buildProduct(10));

    await service.reconcile(TENANT_ID, USER_ID, {
      operationId: "22222222-2222-2222-2222-222222222222",
      productId: PRODUCT_ID,
      branchId: BRANCH_ID,
      countedQuantity: 13,
      reason: "Inventário físico mensal",
    });

    expect(lastCreatedQuantity().toNumber()).toBe(3);
    const call = movementCreate.mock.calls.at(-1)?.[0] as { data: { type: string } };
    expect(call.data.type).toBe("AJUSTE");
  });

  it("reconcile calcula a diferença entre contagem física e o estoque atual (negativa)", async () => {
    productFindFirst.mockResolvedValue(buildProduct(10));

    await service.reconcile(TENANT_ID, USER_ID, {
      operationId: "33333333-3333-3333-3333-333333333333",
      productId: PRODUCT_ID,
      branchId: BRANCH_ID,
      countedQuantity: 6,
      reason: "Inventário físico mensal",
    });

    expect(lastCreatedQuantity().toNumber()).toBe(-4);
  });

  it("corrida de idempotência: P2002 no insert cai para buscar o já existente", async () => {
    transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5.22.0" }),
    );
    movementFindUniqueOrThrow.mockResolvedValue({ id: "movement-que-venceu-a-corrida" });

    const result = await service.createMovement(TENANT_ID, USER_ID, baseInput);

    expect(result).toEqual({ id: "movement-que-venceu-a-corrida" });
  });

  it("alerts filtra produtos com current_stock <= minimum_stock", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: "p1", sku: "A", name: "Abaixo do mínimo", currentStock: new Prisma.Decimal(2), minimumStock: new Prisma.Decimal(5) },
      { id: "p2", sku: "B", name: "Igual ao mínimo", currentStock: new Prisma.Decimal(5), minimumStock: new Prisma.Decimal(5) },
      { id: "p3", sku: "C", name: "Acima do mínimo", currentStock: new Prisma.Decimal(10), minimumStock: new Prisma.Decimal(5) },
    ]);
    const prisma = { product: { findMany } } as unknown as PrismaService;
    const alertService = new StockMovementsService(prisma);

    const result = await alertService.alerts(TENANT_ID);

    expect(result.map((p) => p.sku)).toEqual(["A", "B"]);
  });
});
