import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CreateSaleInput } from "@orbix/validation";
import type { CurrentUser } from "@orbix/types";

import { StockMovementsService } from "../stock/stock-movements.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface ListSalesFilters {
  branchId?: string;
  status?: string;
  cashRegisterId?: string;
  page: number;
  pageSize: number;
}

const MAX_PAGE_SIZE = 100;

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovements: StockMovementsService,
  ) {}

  async create(tenantId: string, userId: string, input: CreateSaleInput) {
    const existing = await this.prisma.sale.findUnique({ where: { operationId: input.operationId } });
    if (existing) return this.findByIdOrThrow(tenantId, existing.id); // idempotência

    const [branch, device, cashRegister] = await Promise.all([
      this.prisma.branch.findFirst({ where: { id: input.branchId, tenantId, deletedAt: null } }),
      this.prisma.device.findFirst({ where: { id: input.deviceId, tenantId, deletedAt: null } }),
      this.prisma.cashRegister.findFirst({ where: { id: input.cashRegisterId, tenantId } }),
    ]);
    if (!branch) throw new NotFoundException("Filial não encontrada.");
    if (!device) throw new NotFoundException("Dispositivo não encontrado.");
    if (!cashRegister) throw new NotFoundException("Caixa não encontrado.");
    // docs/04-regras-negocio.md, 4.2: "Uma venda só pode ser criada com cash_register na situação OPEN".
    if (cashRegister.status !== "OPEN") {
      throw new ConflictException("O caixa informado não está aberto.");
    }
    if (cashRegister.branchId !== input.branchId) {
      throw new BadRequestException("O caixa informado não pertence a esta filial.");
    }

    if (input.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: input.customerId, tenantId, deletedAt: null },
      });
      if (!customer) throw new NotFoundException("Cliente informado não encontrado.");
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, deletedAt: null },
    });
    const productById = new Map(products.map((product) => [product.id, product]));
    for (const item of input.items) {
      if (!productById.has(item.productId)) {
        throw new NotFoundException(`Produto ${item.productId} não encontrado.`);
      }
    }

    const itemsWithTotal = input.items.map((item) => ({
      ...item,
      discount: item.discount ?? 0,
      total: item.quantity * item.unitPrice - (item.discount ?? 0),
    }));
    const discountAmount = input.discountAmount ?? 0;
    const totalAmount = itemsWithTotal.reduce((sum, item) => sum + item.total, 0) - discountAmount;

    const paymentsTotal = input.payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (paymentsTotal !== totalAmount) {
      throw new BadRequestException(
        `Soma dos pagamentos (${paymentsTotal}) não bate com o total da venda (${totalAmount}).`,
      );
    }

    try {
      const saleId = await this.prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            tenantId,
            branchId: input.branchId,
            customerId: input.customerId ?? null,
            status: "COMPLETED",
            totalAmount,
            discountAmount,
            cashRegisterId: input.cashRegisterId,
            deviceId: input.deviceId,
            operationId: input.operationId,
            createdBy: userId,
          },
        });

        await tx.saleItem.createMany({
          data: itemsWithTotal.map((item) => ({
            tenantId,
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
          })),
        });

        await tx.payment.createMany({
          data: input.payments.map((payment) => ({
            tenantId,
            saleId: sale.id,
            method: payment.method,
            amount: payment.amount,
          })),
        });

        // Estoque: -N por item, tipo VENDA (docs/04-regras-negocio.md, 4.2) —
        // gerado pelo sistema como efeito da venda, não como movimento manual
        // (createStockMovementSchema não permite VENDA de propósito).
        for (const item of itemsWithTotal) {
          await this.stockMovements.applySystemMovement(tx, tenantId, userId, {
            productId: item.productId,
            branchId: input.branchId,
            type: "VENDA",
            delta: new Prisma.Decimal(item.quantity).negated(),
            reason: `Venda ${sale.id}`,
            operationId: crypto.randomUUID(),
            referenceId: sale.id,
          });
        }

        return sale.id;
      });

      return this.findByIdOrThrow(tenantId, saleId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const race = await this.prisma.sale.findUnique({ where: { operationId: input.operationId } });
        if (race) return this.findByIdOrThrow(tenantId, race.id);
      }
      throw error;
    }
  }

  async cancel(user: CurrentUser, saleId: string, reason: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId: user.tenantId, deletedAt: null } });
    if (!sale) throw new NotFoundException("Venda não encontrada.");
    if (sale.status === "CANCELLED") return this.findByIdOrThrow(user.tenantId, sale.id); // idempotente por estado

    // docs/04-regras-negocio.md, 4.3: se já tem fiscal AUTHORIZED, cancelamento
    // local sozinho não basta (precisa do fluxo de NF de cancelamento —
    // docs/08-fiscal.md, Fase 10, não implementado ainda). Aqui só bloqueia;
    // não existe emissão fiscal real nesta fase, então isso nunca dispara
    // hoje, mas fica correto para quando a Fase 10 existir.
    const authorizedFiscalDoc = await this.prisma.fiscalDocument.findFirst({
      where: { saleId: sale.id, status: "AUTHORIZED" },
    });
    if (authorizedFiscalDoc) {
      throw new ConflictException(
        "Venda tem documento fiscal autorizado — cancele via fluxo fiscal antes de cancelar a venda.",
      );
    }

    // CanCancelSale(user, sale) (docs/04-regras-negocio.md, 4.3): OWNER/ADMIN
    // sempre podem (RBAC já garantiu isso via sales.cancel). MANAGER só dentro
    // da janela configurada em tenant.settings.saleCancelWindowHours — sem
    // configuração, fica bloqueado por padrão (não inventa um valor default).
    if (user.role === "MANAGER") {
      const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: user.tenantId } });
      const settings = tenant.settings as { saleCancelWindowHours?: number } | null;
      const windowHours = settings?.saleCancelWindowHours;
      const hoursSinceSale = (Date.now() - sale.createdAt.getTime()) / (1000 * 60 * 60);
      if (!windowHours || hoursSinceSale > windowHours) {
        throw new ForbiddenException(
          "Fora da janela de tempo permitida para gerentes cancelarem vendas (ou não configurada pelo tenant).",
        );
      }
    }

    const items = await this.prisma.saleItem.findMany({ where: { saleId: sale.id } });

    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: sale.id }, data: { status: "CANCELLED" } });

      // Estoque: estorno via DEVOLUCAO (nunca edita o movimento original de
      // VENDA — docs/04-regras-negocio.md, 4.3).
      for (const item of items) {
        await this.stockMovements.applySystemMovement(tx, user.tenantId, user.id, {
          productId: item.productId,
          branchId: sale.branchId,
          type: "DEVOLUCAO",
          delta: new Prisma.Decimal(item.quantity.toString()),
          reason: `Estorno de cancelamento da venda ${sale.id}`,
          operationId: crypto.randomUUID(),
          referenceId: sale.id,
        });
      }

      // "Auditoria: log com motivo obrigatório" é parte do próprio fluxo de
      // cancelamento (docs/04-regras-negocio.md, 4.3), não só da Fase 12 —
      // reason não tem outra coluna pra morar.
      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: "SALE_CANCELLED",
          entity: "sale",
          entityId: sale.id,
          before: { status: sale.status },
          after: { status: "CANCELLED", reason },
        },
      });
    });

    return this.findByIdOrThrow(user.tenantId, sale.id);
  }

  async findByIdOrThrow(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { items: true, payments: true },
    });
    if (!sale) throw new NotFoundException("Venda não encontrada.");
    return sale;
  }

  async list(tenantId: string, filters: ListSalesFilters) {
    const pageSize = Math.min(filters.pageSize, MAX_PAGE_SIZE);
    const where: Prisma.SaleWhereInput = {
      tenantId,
      deletedAt: null,
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.status ? { status: filters.status as Prisma.EnumSaleStatusFilter["equals"] } : {}),
      ...(filters.cashRegisterId ? { cashRegisterId: filters.cashRegisterId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: { items: true, payments: true },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { items, total, page: filters.page, pageSize };
  }
}
