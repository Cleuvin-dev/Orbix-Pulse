import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CurrentUser } from "@orbix/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StockMovementsService } from "../stock/stock-movements.service";
import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { SalesService } from "./sales.service";

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const BRANCH_ID = "branch-1";
const DEVICE_ID = "device-1";
const CASH_REGISTER_ID = "cash-register-1";
const PRODUCT_ID = "prod-1";

function buildOwner(): CurrentUser {
  return {
    id: USER_ID,
    email: "owner@orbixpulse.dev",
    name: "Usuário OWNER",
    tenantId: TENANT_ID,
    tenantName: "Empresa Teste",
    role: "OWNER",
  };
}

function buildManager(): CurrentUser {
  return { ...buildOwner(), role: "MANAGER" };
}

describe("SalesService", () => {
  let saleFindUnique: ReturnType<typeof vi.fn>;
  let saleFindFirst: ReturnType<typeof vi.fn>;
  let saleUpdate: ReturnType<typeof vi.fn>;
  let branchFindFirst: ReturnType<typeof vi.fn>;
  let deviceFindFirst: ReturnType<typeof vi.fn>;
  let cashRegisterFindFirst: ReturnType<typeof vi.fn>;
  let customerFindFirst: ReturnType<typeof vi.fn>;
  let productFindMany: ReturnType<typeof vi.fn>;
  let saleItemFindMany: ReturnType<typeof vi.fn>;
  let fiscalDocumentFindFirst: ReturnType<typeof vi.fn>;
  let tenantFindUniqueOrThrow: ReturnType<typeof vi.fn>;
  let auditLogCreate: ReturnType<typeof vi.fn>;
  let applySystemMovement: ReturnType<typeof vi.fn>;
  let transaction: ReturnType<typeof vi.fn>;
  let service: SalesService;
  let tx: Record<string, unknown>;

  beforeEach(() => {
    saleFindUnique = vi.fn().mockResolvedValue(null);
    saleFindFirst = vi.fn().mockResolvedValue({
      id: "sale-1",
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      status: "COMPLETED",
      createdAt: new Date(),
      deletedAt: null,
    });
    saleUpdate = vi.fn();
    branchFindFirst = vi.fn().mockResolvedValue({ id: BRANCH_ID, tenantId: TENANT_ID });
    deviceFindFirst = vi.fn().mockResolvedValue({ id: DEVICE_ID, tenantId: TENANT_ID });
    cashRegisterFindFirst = vi.fn().mockResolvedValue({
      id: CASH_REGISTER_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      status: "OPEN",
    });
    customerFindFirst = vi.fn().mockResolvedValue(null);
    productFindMany = vi.fn().mockResolvedValue([{ id: PRODUCT_ID, tenantId: TENANT_ID }]);
    saleItemFindMany = vi.fn().mockResolvedValue([{ productId: PRODUCT_ID, quantity: new Prisma.Decimal(2) }]);
    fiscalDocumentFindFirst = vi.fn().mockResolvedValue(null);
    tenantFindUniqueOrThrow = vi.fn().mockResolvedValue({ id: TENANT_ID, settings: {} });
    auditLogCreate = vi.fn();
    applySystemMovement = vi.fn().mockResolvedValue({});

    tx = {
      sale: { create: vi.fn().mockResolvedValue({ id: "sale-1" }), update: saleUpdate },
      saleItem: { createMany: vi.fn() },
      payment: { createMany: vi.fn() },
      auditLog: { create: auditLogCreate },
    };
    transaction = vi.fn().mockImplementation((callback: (tx: unknown) => unknown) => callback(tx));

    const prisma = {
      sale: { findUnique: saleFindUnique, findFirst: saleFindFirst, count: vi.fn(), findMany: vi.fn() },
      saleItem: { findMany: saleItemFindMany },
      branch: { findFirst: branchFindFirst },
      device: { findFirst: deviceFindFirst },
      cashRegister: { findFirst: cashRegisterFindFirst },
      customer: { findFirst: customerFindFirst },
      product: { findMany: productFindMany },
      fiscalDocument: { findFirst: fiscalDocumentFindFirst },
      tenant: { findUniqueOrThrow: tenantFindUniqueOrThrow },
      $transaction: transaction,
    } as unknown as PrismaService;

    const stockMovements = { applySystemMovement } as unknown as StockMovementsService;

    service = new SalesService(prisma, stockMovements);
  });

  const baseInput = {
    operationId: "11111111-1111-1111-1111-111111111111",
    branchId: BRANCH_ID,
    deviceId: DEVICE_ID,
    cashRegisterId: CASH_REGISTER_ID,
    items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 500 }],
    payments: [{ method: "CASH" as const, amount: 1000 }],
  };

  it("idempotência: retorna a venda existente sem reprocessar", async () => {
    saleFindUnique.mockResolvedValue({ id: "sale-ja-existe" });
    saleFindFirst.mockResolvedValue({
      id: "sale-ja-existe",
      tenantId: TENANT_ID,
      deletedAt: null,
      items: [],
      payments: [],
    });

    const result = await service.create(TENANT_ID, USER_ID, baseInput);

    expect(result).toMatchObject({ id: "sale-ja-existe" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejeita quando o caixa informado não está aberto", async () => {
    cashRegisterFindFirst.mockResolvedValue({
      id: CASH_REGISTER_ID,
      tenantId: TENANT_ID,
      branchId: BRANCH_ID,
      status: "CLOSED",
    });

    await expect(service.create(TENANT_ID, USER_ID, baseInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejeita quando o caixa não pertence à filial informada", async () => {
    cashRegisterFindFirst.mockResolvedValue({
      id: CASH_REGISTER_ID,
      tenantId: TENANT_ID,
      branchId: "outra-filial",
      status: "OPEN",
    });

    await expect(service.create(TENANT_ID, USER_ID, baseInput)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejeita produto que não pertence ao tenant", async () => {
    productFindMany.mockResolvedValue([]);

    await expect(service.create(TENANT_ID, USER_ID, baseInput)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejeita quando a soma dos pagamentos não bate com o total da venda", async () => {
    await expect(
      service.create(TENANT_ID, USER_ID, { ...baseInput, payments: [{ method: "CASH", amount: 999 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("cria a venda: total correto, baixa de estoque VENDA por item com sinal negativo", async () => {
    saleFindFirst.mockResolvedValue({ id: "sale-1", tenantId: TENANT_ID, deletedAt: null, items: [], payments: [] });

    await service.create(TENANT_ID, USER_ID, baseInput);

    const saleCreateData = (tx.sale as { create: ReturnType<typeof vi.fn> }).create.mock.calls[0]?.[0].data;
    expect(saleCreateData.totalAmount).toBe(1000); // 2 * 500
    expect(saleCreateData.status).toBe("COMPLETED");

    expect(applySystemMovement).toHaveBeenCalledTimes(1);
    const movementArgs = applySystemMovement.mock.calls[0]?.[3];
    expect(movementArgs.type).toBe("VENDA");
    expect((movementArgs.delta as Prisma.Decimal).toNumber()).toBe(-2);
  });

  it("desconto no item e na venda reduz o total corretamente", async () => {
    saleFindFirst.mockResolvedValue({ id: "sale-1", tenantId: TENANT_ID, deletedAt: null, items: [], payments: [] });

    await service.create(TENANT_ID, USER_ID, {
      ...baseInput,
      items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 500, discount: 100 }],
      discountAmount: 50,
      payments: [{ method: "CASH", amount: 850 }], // (2*500 - 100) - 50 = 850
    });

    const saleCreateData = (tx.sale as { create: ReturnType<typeof vi.fn> }).create.mock.calls[0]?.[0].data;
    expect(saleCreateData.totalAmount).toBe(850);
  });

  it("corrida de idempotência: P2002 no insert cai para buscar a venda já criada", async () => {
    transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5.22.0" }),
    );
    saleFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "sale-que-venceu-a-corrida" });
    saleFindFirst.mockResolvedValue({
      id: "sale-que-venceu-a-corrida",
      tenantId: TENANT_ID,
      deletedAt: null,
      items: [],
      payments: [],
    });

    const result = await service.create(TENANT_ID, USER_ID, baseInput);

    expect(result).toMatchObject({ id: "sale-que-venceu-a-corrida" });
  });

  describe("cancel", () => {
    it("rejeita venda inexistente", async () => {
      saleFindFirst.mockResolvedValue(null);

      await expect(service.cancel(buildOwner(), "sale-1", "Cliente desistiu")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("idempotente por estado: venda já cancelada retorna sem reprocessar", async () => {
      saleFindFirst.mockResolvedValue({
        id: "sale-1",
        tenantId: TENANT_ID,
        status: "CANCELLED",
        deletedAt: null,
        items: [],
        payments: [],
      });

      await service.cancel(buildOwner(), "sale-1", "Cliente desistiu");

      expect(transaction).not.toHaveBeenCalled();
    });

    it("rejeita cancelamento se a venda tem documento fiscal AUTHORIZED", async () => {
      fiscalDocumentFindFirst.mockResolvedValue({ id: "fiscal-1", status: "AUTHORIZED" });

      await expect(service.cancel(buildOwner(), "sale-1", "Cliente desistiu")).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("OWNER pode cancelar sem restrição de janela de tempo", async () => {
      saleFindFirst
        .mockResolvedValueOnce({
          id: "sale-1",
          tenantId: TENANT_ID,
          branchId: BRANCH_ID,
          status: "COMPLETED",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 dias atrás
          deletedAt: null,
        })
        .mockResolvedValueOnce({ id: "sale-1", tenantId: TENANT_ID, deletedAt: null, items: [], payments: [] });

      await service.cancel(buildOwner(), "sale-1", "Cliente desistiu");

      expect(transaction).toHaveBeenCalled();
    });

    it("MANAGER sem tenant.settings.saleCancelWindowHours configurado é bloqueado", async () => {
      await expect(service.cancel(buildManager(), "sale-1", "Cliente desistiu")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("MANAGER dentro da janela configurada pode cancelar", async () => {
      tenantFindUniqueOrThrow.mockResolvedValue({ id: TENANT_ID, settings: { saleCancelWindowHours: 24 } });
      saleFindFirst
        .mockResolvedValueOnce({
          id: "sale-1",
          tenantId: TENANT_ID,
          branchId: BRANCH_ID,
          status: "COMPLETED",
          createdAt: new Date(), // agora
          deletedAt: null,
        })
        .mockResolvedValueOnce({ id: "sale-1", tenantId: TENANT_ID, deletedAt: null, items: [], payments: [] });

      await service.cancel(buildManager(), "sale-1", "Cliente desistiu");

      expect(transaction).toHaveBeenCalled();
    });

    it("MANAGER fora da janela configurada é bloqueado", async () => {
      tenantFindUniqueOrThrow.mockResolvedValue({ id: TENANT_ID, settings: { saleCancelWindowHours: 1 } });
      saleFindFirst.mockResolvedValue({
        id: "sale-1",
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        status: "COMPLETED",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5h atrás
        deletedAt: null,
      });

      await expect(service.cancel(buildManager(), "sale-1", "Cliente desistiu")).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("cancelamento gera estorno DEVOLUCAO por item e grava audit_log com o motivo", async () => {
      saleFindFirst
        .mockResolvedValueOnce({
          id: "sale-1",
          tenantId: TENANT_ID,
          branchId: BRANCH_ID,
          status: "COMPLETED",
          createdAt: new Date(),
          deletedAt: null,
        })
        .mockResolvedValueOnce({ id: "sale-1", tenantId: TENANT_ID, deletedAt: null, items: [], payments: [] });

      await service.cancel(buildOwner(), "sale-1", "Cliente desistiu");

      expect(saleUpdate).toHaveBeenCalledWith({ where: { id: "sale-1" }, data: { status: "CANCELLED" } });
      expect(applySystemMovement).toHaveBeenCalledTimes(1);
      const movementArgs = applySystemMovement.mock.calls[0]?.[3];
      expect(movementArgs.type).toBe("DEVOLUCAO");
      expect((movementArgs.delta as Prisma.Decimal).toNumber()).toBe(2);

      expect(auditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "SALE_CANCELLED",
          entity: "sale",
          entityId: "sale-1",
          after: { status: "CANCELLED", reason: "Cliente desistiu" },
        }),
      });
    });
  });
});
