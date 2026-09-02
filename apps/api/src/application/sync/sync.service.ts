import { ForbiddenException, HttpException, Injectable } from "@nestjs/common";
import type { CurrentUser } from "@orbix/types";
import {
  cancelSaleSchema,
  closeCashRegisterSchema,
  createSaleSchema,
  createStockMovementSchema,
  openCashRegisterSchema,
  reconcileStockSchema,
  type SyncBatchInput,
  type SyncEntity,
} from "@orbix/validation";
import { ZodError } from "zod";

import { CashRegistersService } from "../sales/cash-registers.service";
import { SalesService } from "../sales/sales.service";
import { StockMovementsService } from "../stock/stock-movements.service";
import { CanPerformService } from "../permissions/can-perform.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";

// Permissão exigida por tipo de evento (docs/05-permissoes-rbac.md, 5.4) —
// checada por operação dentro do lote, não pela rota inteira (uma operação
// sem permissão não derruba as outras — docs/09-api.md, 9.5).
const ENTITY_PERMISSION: Record<SyncEntity, string> = {
  SALE_CREATED: "sales.create",
  SALE_CANCELLED: "sales.cancel",
  STOCK_MOVEMENT_CREATED: "stock.movement.create",
  STOCK_RECONCILED: "stock.adjust",
  CASH_REGISTER_OPENED: "cash_register.open_close",
  CASH_REGISTER_CLOSED: "cash_register.open_close",
};

// docs/03-modelo-dados.md (3.3, sync_operations): "categoria/tabela de
// domínio associada ao evento".
const ENTITY_TYPE: Record<SyncEntity, string> = {
  SALE_CREATED: "sale",
  SALE_CANCELLED: "sale",
  STOCK_MOVEMENT_CREATED: "stock_movement",
  STOCK_RECONCILED: "stock_movement",
  CASH_REGISTER_OPENED: "cash_register",
  CASH_REGISTER_CLOSED: "cash_register",
};

export interface SyncOperationResult {
  operationId: string;
  status: "APPLIED" | "REJECTED" | "ALREADY_PROCESSED";
  serverId?: string;
  error?: string;
}

// Sync Engine (docs/07-sync-engine.md) — o endpoint mais crítico do sistema.
// Reaproveita os mesmos serviços/idempotência já construídos nas Fases 5 e 6
// (StockMovementsService, SalesService, CashRegistersService) em vez de
// duplicar a lógica de negócio aqui: este serviço só resolve QUEM chamar,
// checa permissão por operação e registra o resultado em sync_operations
// (a fila/ledger de idempotência do lote — docs/07-sync-engine.md, 7.2/7.6).
//
// Escopo desta fase (sinalizado, não escondido): só as entidades "aditivas"
// ou de "bloqueio de negócio" da tabela 7.7 (vendas, estoque, caixa) —
// exatamente as que docs/06-offline-first.md (6.7) chama de "parte
// operacional" que precisa tolerar horas/dias offline. LWW de
// products.price/name e customers (7.7) fica de fora: exigiria rastrear o
// operation_id/timestamp do último edit por campo, o que o schema atual não
// guarda em lugar nenhum (nem em Product, nem de forma consultável em
// sync_operations sem uma coluna entity_id) — decisão estrutural que não
// tomei sozinho.
@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly canPerform: CanPerformService,
    private readonly sales: SalesService,
    private readonly stockMovements: StockMovementsService,
    private readonly cashRegisters: CashRegistersService,
  ) {}

  async processBatch(user: CurrentUser, input: SyncBatchInput): Promise<SyncOperationResult[]> {
    const results: SyncOperationResult[] = [];

    // Sequencial de propósito: docs/07-sync-engine.md (7.4) — "operações são
    // enviadas em ordem de criação, respeitando dependências (ex: SALE_CREATED
    // antes de PAYMENT_CREATED referente àquela venda)". Processar em paralelo
    // quebraria essa garantia de ordem dentro do lote de um dispositivo.
    for (const operation of input.operations) {
      results.push(await this.processOne(user, input.deviceId, operation));
    }

    return results;
  }

  private async processOne(
    user: CurrentUser,
    deviceId: string,
    operation: SyncBatchInput["operations"][number],
  ): Promise<SyncOperationResult> {
    const existing = await this.prisma.syncOperation.findUnique({
      where: { operationId: operation.operationId },
    });
    if (existing?.status === "APPLIED") {
      // docs/07-sync-engine.md (7.2): "retorna o resultado já processado
      // anteriormente (sem reprocessar)". Rechama o serviço de destino, que é
      // idempotente por operationId na própria tabela — barato (é um SELECT),
      // e evita duplicar "qual é o id do registro" numa segunda coluna aqui.
      const entity = await this.dispatch(user, operation.entity, this.withOperationId(operation));
      return { operationId: operation.operationId, status: "ALREADY_PROCESSED", serverId: entity.id };
    }

    const permission = ENTITY_PERMISSION[operation.entity];
    const allowed = await this.canPerform.check(user, permission);
    if (!allowed) {
      await this.recordOperation(user.tenantId, deviceId, operation, "REJECTED", "permission_denied");
      return { operationId: operation.operationId, status: "REJECTED", error: "permission_denied" };
    }

    try {
      const entity = await this.dispatch(user, operation.entity, this.withOperationId(operation));
      await this.recordOperation(user.tenantId, deviceId, operation, "APPLIED");
      return { operationId: operation.operationId, status: "APPLIED", serverId: entity.id };
    } catch (error) {
      const message = this.describeError(error);
      await this.recordOperation(user.tenantId, deviceId, operation, "REJECTED", message);
      return { operationId: operation.operationId, status: "REJECTED", error: message };
    }
  }

  private withOperationId(operation: SyncBatchInput["operations"][number]) {
    return { ...operation.payload, operationId: operation.operationId };
  }

  private async dispatch(
    user: CurrentUser,
    entity: SyncEntity,
    payload: Record<string, unknown>,
  ): Promise<{ id: string }> {
    switch (entity) {
      case "SALE_CREATED":
        return this.sales.create(user.tenantId, user.id, createSaleSchema.parse(payload));
      case "SALE_CANCELLED": {
        const input = cancelSaleSchema.parse(payload);
        const saleId = this.requireStringField(payload, "saleId");
        return this.sales.cancel(user, saleId, input.reason);
      }
      case "STOCK_MOVEMENT_CREATED":
        return this.stockMovements.createMovement(user.tenantId, user.id, createStockMovementSchema.parse(payload));
      case "STOCK_RECONCILED":
        return this.stockMovements.reconcile(user.tenantId, user.id, reconcileStockSchema.parse(payload));
      case "CASH_REGISTER_OPENED":
        return this.cashRegisters.open(user.tenantId, user.id, openCashRegisterSchema.parse(payload));
      case "CASH_REGISTER_CLOSED": {
        const input = closeCashRegisterSchema.parse(payload);
        const cashRegisterId = this.requireStringField(payload, "cashRegisterId");
        return this.cashRegisters.close(user.tenantId, user.id, cashRegisterId, input);
      }
    }
  }

  private requireStringField(payload: Record<string, unknown>, field: string): string {
    const value = payload[field];
    if (typeof value !== "string") {
      throw new ForbiddenException(`Campo "${field}" ausente ou inválido no payload.`);
    }
    return value;
  }

  private describeError(error: unknown): string {
    // Checagem por nome/forma, não só `instanceof`: packages/validation e
    // apps/api podem acabar com instâncias de `zod` fisicamente diferentes no
    // node_modules dependendo de como o pnpm resolve os ranges de versão — e
    // nesse caso `instanceof ZodError` falha silenciosamente mesmo sendo,
    // logicamente, o mesmo tipo de erro.
    if (this.isZodError(error)) {
      return `payload_invalido: ${error.issues.map((issue) => issue.path.join(".")).join(",")}`;
    }
    if (error instanceof HttpException) return error.message;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    return "erro_inesperado";
  }

  private isZodError(error: unknown): error is ZodError {
    return (
      error instanceof ZodError ||
      (typeof error === "object" &&
        error !== null &&
        (error as { name?: unknown }).name === "ZodError" &&
        Array.isArray((error as { issues?: unknown }).issues))
    );
  }

  private async recordOperation(
    tenantId: string,
    deviceId: string,
    operation: SyncBatchInput["operations"][number],
    status: "APPLIED" | "REJECTED",
    errorMessage?: string,
  ) {
    await this.prisma.syncOperation.upsert({
      where: { operationId: operation.operationId },
      update: { status, errorMessage, processedAt: new Date() },
      create: {
        tenantId,
        deviceId,
        operationId: operation.operationId,
        entity: operation.entity,
        entityType: ENTITY_TYPE[operation.entity],
        payload: operation.payload as never,
        status,
        errorMessage,
        processedAt: new Date(),
      },
    });
  }

  // GET /sync/status (docs/09-api.md, 9.4) — visão do dispositivo sobre o
  // próprio estado de sincronização, não o "painel técnico" de observabilidade
  // (7.8, que é outra coisa — auditoria/ops, Fase 12).
  async status(tenantId: string, deviceId?: string) {
    const where = deviceId ? { tenantId, deviceId } : { tenantId };
    const counts = await this.prisma.syncOperation.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    });

    return {
      pending: counts.find((c) => c.status === "PENDING")?._count._all ?? 0,
      applied: counts.find((c) => c.status === "APPLIED")?._count._all ?? 0,
      rejected: counts.find((c) => c.status === "REJECTED")?._count._all ?? 0,
      conflict: counts.find((c) => c.status === "CONFLICT")?._count._all ?? 0,
    };
  }
}
