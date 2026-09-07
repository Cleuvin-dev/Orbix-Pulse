import { Injectable } from "@nestjs/common";
import type { FinancePeriodQuery } from "@orbix/validation";

import { PrismaService } from "../../infrastructure/database/prisma.service";
import { FinanceReportsService } from "../finance/finance-reports.service";
import { StockMovementsService } from "../stock/stock-movements.service";

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
  revenue: number;
}

// Painel executivo (docs/12-roadmap-fases.md, Fase 11 — docs/01-visao-produto.md,
// 1.3): "faturamento, lucro, margem, top produtos, estoque crítico". Reaproveita
// FinanceReportsService.dre (Fase 7) e StockMovementsService.alerts (Fase 5) em
// vez de duplicar a lógica de cada um — só agrega aqui o que ainda não existe em
// lugar nenhum (contagem de vendas, ticket médio, ranking de produtos).
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeReports: FinanceReportsService,
    private readonly stock: StockMovementsService,
  ) {}

  async dashboard(tenantId: string, period: FinancePeriodQuery) {
    const [dre, alerts, salesAgg, topProducts, openCashRegistersCount] = await Promise.all([
      this.financeReports.dre(tenantId, period),
      this.stock.alerts(tenantId),
      this.prisma.sale.aggregate({
        where: { tenantId, status: { not: "CANCELLED" }, createdAt: { gte: period.from, lte: period.to } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.topProducts(tenantId, period),
      // Ponto-no-tempo (agora), não filtrado pelo período — "quantos caixas
      // estão abertos neste momento" é uma pergunta operacional, não histórica.
      this.prisma.cashRegister.count({ where: { tenantId, status: "OPEN" } }),
    ]);

    const salesRevenue = salesAgg._sum.totalAmount ?? 0;
    const salesCount = salesAgg._count;

    return {
      from: period.from,
      to: period.to,
      revenue: dre.grossRevenue,
      profit: dre.grossProfit,
      marginPct: dre.grossRevenue > 0 ? (dre.grossProfit / dre.grossRevenue) * 100 : 0,
      salesCount,
      averageTicket: salesCount > 0 ? Math.round(salesRevenue / salesCount) : 0,
      criticalStockCount: alerts.length,
      openCashRegistersCount,
      topProducts,
    };
  }

  // Ranking por quantidade vendida no período (docs/01-visao-produto.md, 1.3).
  // `sale_items.total` já é o valor líquido da linha (unit_price*quantity -
  // discount), calculado no momento da venda (Fase 6) — soma ele em vez de
  // recalcular, evita divergir do que a venda realmente registrou.
  private async topProducts(tenantId: string, period: FinancePeriodQuery): Promise<TopProduct[]> {
    const items = await this.prisma.saleItem.findMany({
      where: {
        tenantId,
        sale: { status: { not: "CANCELLED" }, createdAt: { gte: period.from, lte: period.to } },
      },
      select: {
        quantity: true,
        total: true,
        productId: true,
        product: { select: { name: true, sku: true } },
      },
    });

    const byProduct = new Map<string, TopProduct>();
    for (const item of items) {
      const quantity = item.quantity.toNumber();
      const current = byProduct.get(item.productId);
      if (current) {
        current.quantitySold += quantity;
        current.revenue += item.total;
      } else {
        byProduct.set(item.productId, {
          productId: item.productId,
          name: item.product.name,
          sku: item.product.sku,
          quantitySold: quantity,
          revenue: item.total,
        });
      }
    }

    return [...byProduct.values()].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 5);
  }
}
