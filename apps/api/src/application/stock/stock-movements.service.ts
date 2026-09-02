import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type StockMovementType } from "@prisma/client";
import type { CreateStockMovementInput, ReconcileStockInput } from "@orbix/validation";

import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface ListMovementsFilters {
  productId?: string;
  page: number;
  pageSize: number;
}

const MAX_PAGE_SIZE = 100;

// Sinal do efeito no estoque por tipo (docs/04-regras-negocio.md, 4.4): Entrada
// engloba compra recebida/devolução/ajuste positivo; Saída engloba
// venda/perda/ajuste negativo/transferência entre filiais. AJUSTE não entra
// aqui — tem sinal próprio, calculado em reconcile() a partir da diferença.
const MOVEMENT_SIGN: Partial<Record<StockMovementType, 1 | -1>> = {
  ENTRADA: 1,
  DEVOLUCAO: 1,
  SAIDA: -1,
  TRANSFERENCIA: -1,
};

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async createMovement(tenantId: string, userId: string, input: CreateStockMovementInput) {
    const existing = await this.prisma.stockMovement.findUnique({ where: { operationId: input.operationId } });
    if (existing) return existing; // idempotência (docs/07-sync-engine.md, 7.2)

    const [product] = await Promise.all([
      this.findProductOrThrow(tenantId, input.productId),
      this.findBranchOrThrow(tenantId, input.branchId),
    ]);

    const sign = MOVEMENT_SIGN[input.type];
    if (!sign) {
      // Nunca deveria acontecer — createStockMovementSchema já restringe o enum
      // aos 4 tipos manuais. Guarda de tipo, não caminho de negócio real.
      throw new ConflictException(`Tipo de movimento não suportado neste endpoint: ${input.type}.`);
    }
    const delta = new Prisma.Decimal(input.quantity).times(sign);

    return this.applyMovement(tenantId, userId, {
      productId: input.productId,
      branchId: input.branchId,
      type: input.type,
      delta,
      reason: input.reason,
      operationId: input.operationId,
      currentStock: product.currentStock,
    });
  }

  async reconcile(tenantId: string, userId: string, input: ReconcileStockInput) {
    const existing = await this.prisma.stockMovement.findUnique({ where: { operationId: input.operationId } });
    if (existing) return existing;

    const [product] = await Promise.all([
      this.findProductOrThrow(tenantId, input.productId),
      this.findBranchOrThrow(tenantId, input.branchId),
    ]);

    const delta = new Prisma.Decimal(input.countedQuantity).minus(product.currentStock);

    return this.applyMovement(tenantId, userId, {
      productId: input.productId,
      branchId: input.branchId,
      type: "AJUSTE",
      delta,
      reason: input.reason,
      operationId: input.operationId,
      currentStock: product.currentStock,
    });
  }

  async list(tenantId: string, filters: ListMovementsFilters) {
    const pageSize = Math.min(filters.pageSize, MAX_PAGE_SIZE);
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      ...(filters.productId ? { productId: filters.productId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, total, page: filters.page, pageSize };
  }

  // Alerta simples baseado em limiar fixo (docs/04-regras-negocio.md, 4.4 —
  // "Nível MVP", sem cálculo preditivo). Prisma não compara duas colunas
  // Decimal entre si na query, então filtra em código — catálogo de uma
  // empresa é pequeno o bastante pra isso não ser um problema de performance.
  async alerts(tenantId: string) {
    const candidates = await this.prisma.product.findMany({
      where: { tenantId, deletedAt: null, isActive: true, minimumStock: { not: null } },
      select: { id: true, sku: true, name: true, currentStock: true, minimumStock: true },
      orderBy: { name: "asc" },
    });
    return candidates.filter((product) => product.minimumStock && product.currentStock.lte(product.minimumStock));
  }

  private async findProductOrThrow(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException("Produto não encontrado.");
    return product;
  }

  private async findBranchOrThrow(tenantId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
    });
    if (!branch) throw new NotFoundException("Filial não encontrada.");
    return branch;
  }

  private async applyMovement(
    tenantId: string,
    userId: string,
    params: {
      productId: string;
      branchId: string;
      type: StockMovementType;
      delta: Prisma.Decimal;
      reason: string;
      operationId: string;
      currentStock: Prisma.Decimal;
    },
  ) {
    if (params.delta.isNegative()) {
      const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      const settings = tenant.settings as { allowNegativeStock?: boolean } | null;
      const allowNegativeStock = settings?.allowNegativeStock === true;

      const projected = params.currentStock.plus(params.delta);
      if (projected.isNegative() && !allowNegativeStock) {
        // docs/04-regras-negocio.md, 4.2: estoque negativo só com config explícita do tenant.
        throw new ConflictException(
          "Estoque insuficiente para essa saída (tenant não permite estoque negativo).",
        );
      }
    }

    try {
      const [movement] = await this.prisma.$transaction([
        this.prisma.stockMovement.create({
          data: {
            tenantId,
            productId: params.productId,
            branchId: params.branchId,
            type: params.type,
            quantity: params.delta,
            reason: params.reason,
            operationId: params.operationId,
            createdBy: userId,
          },
        }),
        this.prisma.product.update({
          where: { id: params.productId },
          data: { currentStock: { increment: params.delta } },
        }),
      ]);
      return movement;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Corrida: outra requisição com o mesmo operation_id venceu entre o
        // check inicial e este insert — idempotência ainda vale.
        return this.prisma.stockMovement.findUniqueOrThrow({ where: { operationId: params.operationId } });
      }
      throw error;
    }
  }
}
