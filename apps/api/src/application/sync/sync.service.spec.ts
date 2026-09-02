import { NotFoundException } from "@nestjs/common";
import type { CurrentUser } from "@orbix/types";
import type { SyncBatchInput } from "@orbix/validation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CashRegistersService } from "../sales/cash-registers.service";
import type { SalesService } from "../sales/sales.service";
import type { StockMovementsService } from "../stock/stock-movements.service";
import type { CanPerformService } from "../permissions/can-perform.service";
import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { SyncService } from "./sync.service";

const TENANT_ID = "tenant-1";
const DEVICE_ID = "22222222-2222-2222-2222-222222222222";

function buildUser(): CurrentUser {
  return {
    id: "user-1",
    email: "cashier@orbixpulse.dev",
    name: "Usuário CASHIER",
    tenantId: TENANT_ID,
    tenantName: "Empresa Teste",
    role: "CASHIER",
  };
}

function buildOperation(overrides: Partial<SyncBatchInput["operations"][number]> = {}) {
  return {
    operationId: "11111111-1111-1111-1111-111111111111",
    entity: "STOCK_MOVEMENT_CREATED" as const,
    payload: {
      productId: "33333333-3333-3333-3333-333333333333",
      branchId: "44444444-4444-4444-4444-444444444444",
      type: "ENTRADA",
      quantity: 5,
      reason: "Compra recebida",
    },
    createdAt: new Date(),
    ...overrides,
  };
}

describe("SyncService", () => {
  let syncOperationFindUnique: ReturnType<typeof vi.fn>;
  let syncOperationUpsert: ReturnType<typeof vi.fn>;
  let syncOperationGroupBy: ReturnType<typeof vi.fn>;
  let canPerformCheck: ReturnType<typeof vi.fn>;
  let createMovement: ReturnType<typeof vi.fn>;
  let salesCreate: ReturnType<typeof vi.fn>;
  let salesCancel: ReturnType<typeof vi.fn>;
  let cashRegistersOpen: ReturnType<typeof vi.fn>;
  let cashRegistersClose: ReturnType<typeof vi.fn>;
  let service: SyncService;

  beforeEach(() => {
    syncOperationFindUnique = vi.fn().mockResolvedValue(null);
    syncOperationUpsert = vi.fn();
    syncOperationGroupBy = vi.fn().mockResolvedValue([]);
    canPerformCheck = vi.fn().mockResolvedValue(true);
    createMovement = vi.fn().mockResolvedValue({ id: "movement-1" });
    salesCreate = vi.fn().mockResolvedValue({ id: "sale-1" });
    salesCancel = vi.fn().mockResolvedValue({ id: "sale-1" });
    cashRegistersOpen = vi.fn().mockResolvedValue({ id: "cash-1" });
    cashRegistersClose = vi.fn().mockResolvedValue({ id: "cash-1" });

    const prisma = {
      syncOperation: { findUnique: syncOperationFindUnique, upsert: syncOperationUpsert, groupBy: syncOperationGroupBy },
    } as unknown as PrismaService;
    const canPerform = { check: canPerformCheck } as unknown as CanPerformService;
    const sales = { create: salesCreate, cancel: salesCancel } as unknown as SalesService;
    const stockMovements = {
      createMovement,
      reconcile: vi.fn().mockResolvedValue({ id: "movement-2" }),
    } as unknown as StockMovementsService;
    const cashRegisters = { open: cashRegistersOpen, close: cashRegistersClose } as unknown as CashRegistersService;

    service = new SyncService(prisma, canPerform, sales, stockMovements, cashRegisters);
  });

  it("processa uma operação com sucesso: APPLIED + grava sync_operations", async () => {
    const op = buildOperation();

    const [result] = await service.processBatch(buildUser(), { deviceId: DEVICE_ID, operations: [op] });

    expect(result).toEqual({ operationId: op.operationId, status: "APPLIED", serverId: "movement-1" });
    expect(createMovement).toHaveBeenCalledWith(
      TENANT_ID,
      "user-1",
      expect.objectContaining({ operationId: op.operationId, type: "ENTRADA", quantity: 5 }),
    );
    expect(syncOperationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { operationId: op.operationId },
        update: expect.objectContaining({ status: "APPLIED" }),
      }),
    );
  });

  it("idempotência: sync_operation já APPLIED não rechama a checagem de permissão nem reprocessa validação", async () => {
    syncOperationFindUnique.mockResolvedValue({ operationId: "op-1", status: "APPLIED" });
    const op = buildOperation();

    const [result] = await service.processBatch(buildUser(), { deviceId: DEVICE_ID, operations: [op] });

    expect(result).toEqual({ operationId: op.operationId, status: "ALREADY_PROCESSED", serverId: "movement-1" });
    expect(canPerformCheck).not.toHaveBeenCalled();
    expect(createMovement).toHaveBeenCalledTimes(1); // rechamado, mas é idempotente na própria tabela
  });

  it("permissão negada: REJECTED, não chama o serviço de destino", async () => {
    canPerformCheck.mockResolvedValue(false);
    const op = buildOperation();

    const [result] = await service.processBatch(buildUser(), { deviceId: DEVICE_ID, operations: [op] });

    expect(result).toEqual({ operationId: op.operationId, status: "REJECTED", error: "permission_denied" });
    expect(createMovement).not.toHaveBeenCalled();
    expect(syncOperationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ status: "REJECTED", errorMessage: "permission_denied" }) }),
    );
  });

  it("erro de regra de negócio no serviço de destino vira REJECTED com a mensagem original", async () => {
    createMovement.mockRejectedValue(new NotFoundException("Produto não encontrado."));
    const op = buildOperation();

    const [result] = await service.processBatch(buildUser(), { deviceId: DEVICE_ID, operations: [op] });

    expect(result).toEqual({ operationId: op.operationId, status: "REJECTED", error: "Produto não encontrado." });
  });

  it("payload inválido vira REJECTED (payload_invalido), não derruba o lote", async () => {
    const badOp = buildOperation({ payload: { productId: "nao-e-uuid" } });

    const [result] = await service.processBatch(buildUser(), { deviceId: DEVICE_ID, operations: [badOp] });

    expect(result?.status).toBe("REJECTED");
    expect(result?.error).toContain("payload_invalido");
  });

  it("uma operação rejeitada não impede as demais de serem processadas (docs/09-api.md, 9.5)", async () => {
    canPerformCheck.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const op1 = buildOperation({ operationId: "11111111-1111-1111-1111-111111111111" });
    const op2 = buildOperation({ operationId: "55555555-5555-5555-5555-555555555555" });

    const results = await service.processBatch(buildUser(), { deviceId: DEVICE_ID, operations: [op1, op2] });

    expect(results[0]?.status).toBe("REJECTED");
    expect(results[1]?.status).toBe("APPLIED");
  });

  it("SALE_CANCELLED dispatcha pro SalesService.cancel com saleId do payload", async () => {
    const op = buildOperation({
      entity: "SALE_CANCELLED",
      payload: { saleId: "66666666-6666-6666-6666-666666666666", reason: "Cliente desistiu" },
    });

    await service.processBatch(buildUser(), { deviceId: DEVICE_ID, operations: [op] });

    expect(salesCancel).toHaveBeenCalledWith(buildUser(), "66666666-6666-6666-6666-666666666666", "Cliente desistiu");
  });

  it("CASH_REGISTER_CLOSED dispatcha pro CashRegistersService.close com cashRegisterId do payload", async () => {
    const op = buildOperation({
      entity: "CASH_REGISTER_CLOSED",
      payload: { cashRegisterId: "77777777-7777-7777-7777-777777777777", closingAmount: 10000 },
    });

    await service.processBatch(buildUser(), { deviceId: DEVICE_ID, operations: [op] });

    expect(cashRegistersClose).toHaveBeenCalledWith(TENANT_ID, "user-1", "77777777-7777-7777-7777-777777777777", {
      closingAmount: 10000,
    });
  });

  it("status agrega contagens por status corretamente", async () => {
    syncOperationGroupBy.mockResolvedValue([
      { status: "APPLIED", _count: { _all: 5 } },
      { status: "REJECTED", _count: { _all: 2 } },
    ]);

    const result = await service.status(TENANT_ID);

    expect(result).toEqual({ pending: 0, applied: 5, rejected: 2, conflict: 0 });
  });
});
