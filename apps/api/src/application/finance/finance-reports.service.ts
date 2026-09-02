import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/database/prisma.service";

export interface PeriodQuery {
  from: Date;
  to: Date;
}

@Injectable()
export class FinanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Fluxo de caixa: visão agregada sobre finance_entries + sales + payments,
  // não uma tabela própria (docs/04-regras-negocio.md, 4.6).
  async cashFlow(tenantId: string, period: PeriodQuery) {
    const [salesInflow, receivablesInflow, payablesOutflow] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          createdAt: { gte: period.from, lte: period.to },
          sale: { status: { not: "CANCELLED" } },
        },
        _sum: { amount: true },
      }),
      this.prisma.financeEntry.aggregate({
        where: { tenantId, type: "RECEIVABLE", status: "PAID", paidAt: { gte: period.from, lte: period.to } },
        _sum: { amount: true },
      }),
      this.prisma.financeEntry.aggregate({
        where: { tenantId, type: "PAYABLE", status: "PAID", paidAt: { gte: period.from, lte: period.to } },
        _sum: { amount: true },
      }),
    ]);

    const inflow = (salesInflow._sum.amount ?? 0) + (receivablesInflow._sum.amount ?? 0);
    const outflow = payablesOutflow._sum.amount ?? 0;

    return {
      from: period.from,
      to: period.to,
      inflow,
      outflow,
      net: inflow - outflow,
      breakdown: {
        salesInflow: salesInflow._sum.amount ?? 0,
        receivablesInflow: receivablesInflow._sum.amount ?? 0,
        payablesOutflow: outflow,
      },
    };
  }

  // DRE básico (docs/04-regras-negocio.md, 4.6). Duas simplificações
  // sinalizadas, sem suporte direto no schema atual:
  // - "Impostos" sempre 0 — a doc só fala em deduzir "quando aplicável, via
  //   dados fiscais", e não há emissão fiscal real ainda (Fase 10).
  // - CMV usa o cost_price ATUAL do produto, não o valor no momento da venda
  //   — sale_items não guarda um snapshot de custo (só unit_price, que é
  //   preço de venda). Se o custo mudar depois, o DRE de períodos passados
  //   muda junto — isso é uma aproximação, não o valor histórico exato.
  async dre(tenantId: string, period: PeriodQuery) {
    const [salesRevenue, saleItemsForCmv, revenueEntries, costEntries, expenseEntries] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { tenantId, status: { not: "CANCELLED" }, createdAt: { gte: period.from, lte: period.to } },
        _sum: { totalAmount: true },
      }),
      this.prisma.saleItem.findMany({
        where: {
          tenantId,
          sale: { status: { not: "CANCELLED" }, createdAt: { gte: period.from, lte: period.to } },
        },
        select: { quantity: true, product: { select: { costPrice: true } } },
      }),
      this.prisma.financeEntry.aggregate({
        where: {
          tenantId,
          type: "RECEIVABLE",
          status: "PAID",
          paidAt: { gte: period.from, lte: period.to },
          category: { kind: "REVENUE" },
        },
        _sum: { amount: true },
      }),
      this.prisma.financeEntry.aggregate({
        where: {
          tenantId,
          type: "PAYABLE",
          status: "PAID",
          paidAt: { gte: period.from, lte: period.to },
          category: { kind: "COST" },
        },
        _sum: { amount: true },
      }),
      this.prisma.financeEntry.aggregate({
        where: {
          tenantId,
          type: "PAYABLE",
          status: "PAID",
          paidAt: { gte: period.from, lte: period.to },
          category: { kind: "EXPENSE" },
        },
        _sum: { amount: true },
      }),
    ]);

    const cmvFromSales = saleItemsForCmv.reduce(
      (sum, item) => sum + Math.round(item.quantity.toNumber() * item.product.costPrice),
      0,
    );

    const grossRevenue = (salesRevenue._sum.totalAmount ?? 0) + (revenueEntries._sum.amount ?? 0);
    const taxes = 0; // ver comentário acima
    const netRevenue = grossRevenue - taxes;
    const cogs = cmvFromSales + (costEntries._sum.amount ?? 0);
    const grossProfit = netRevenue - cogs;
    const operatingExpenses = expenseEntries._sum.amount ?? 0;
    const operatingProfit = grossProfit - operatingExpenses;

    return {
      from: period.from,
      to: period.to,
      grossRevenue,
      taxes,
      netRevenue,
      costOfGoodsSold: cogs,
      grossProfit,
      operatingExpenses,
      operatingProfit,
    };
  }
}
