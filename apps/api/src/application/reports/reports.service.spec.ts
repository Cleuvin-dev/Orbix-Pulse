import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import type { FinanceReportsService } from "../finance/finance-reports.service";
import type { StockMovementsService } from "../stock/stock-movements.service";
import { ReportsService } from "./reports.service";

const TENANT_ID = "tenant-1";
const PERIOD = { from: new Date("2026-09-01"), to: new Date("2026-09-30") };

const DRE_RESULT = {
  from: PERIOD.from,
  to: PERIOD.to,
  grossRevenue: 100000,
  taxes: 0,
  netRevenue: 100000,
  costOfGoodsSold: 40000,
  grossProfit: 60000,
  operatingExpenses: 0,
  operatingProfit: 60000,
};

function buildService(overrides: {
  saleAggregate?: ReturnType<typeof vi.fn>;
  saleItemFindMany?: ReturnType<typeof vi.fn>;
  alerts?: unknown[];
  dre?: typeof DRE_RESULT;
  openCashRegistersCount?: number;
}) {
  const prisma = {
    sale: { aggregate: overrides.saleAggregate ?? vi.fn().mockResolvedValue({ _sum: { totalAmount: 0 }, _count: 0 }) },
    saleItem: { findMany: overrides.saleItemFindMany ?? vi.fn().mockResolvedValue([]) },
    cashRegister: { count: vi.fn().mockResolvedValue(overrides.openCashRegistersCount ?? 0) },
  } as unknown as PrismaService;

  const financeReports = {
    dre: vi.fn().mockResolvedValue(overrides.dre ?? DRE_RESULT),
  } as unknown as FinanceReportsService;

  const stock = {
    alerts: vi.fn().mockResolvedValue(overrides.alerts ?? []),
  } as unknown as StockMovementsService;

  return new ReportsService(prisma, financeReports, stock);
}

describe("ReportsService", () => {
  it("dashboard: calcula margem, ticket médio e contagem de estoque crítico", async () => {
    const service = buildService({
      saleAggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: 90000 }, _count: 3 }),
      alerts: [{ id: "p1" }, { id: "p2" }],
      openCashRegistersCount: 1,
    });

    const result = await service.dashboard(TENANT_ID, PERIOD);

    expect(result.revenue).toBe(100000);
    expect(result.profit).toBe(60000);
    expect(result.marginPct).toBe(60); // 60000/100000 * 100
    expect(result.salesCount).toBe(3);
    expect(result.averageTicket).toBe(30000); // 90000 / 3
    expect(result.criticalStockCount).toBe(2);
    expect(result.openCashRegistersCount).toBe(1);
  });

  it("dashboard: período sem receita não quebra (margem/ticket = 0)", async () => {
    const service = buildService({
      dre: {
        from: PERIOD.from,
        to: PERIOD.to,
        grossRevenue: 0,
        taxes: 0,
        netRevenue: 0,
        costOfGoodsSold: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        operatingProfit: 0,
      },
    });

    const result = await service.dashboard(TENANT_ID, PERIOD);

    expect(result).toMatchObject({
      revenue: 0,
      profit: 0,
      marginPct: 0,
      salesCount: 0,
      averageTicket: 0,
      criticalStockCount: 0,
      topProducts: [],
    });
  });

  it("dashboard: agrega itens do mesmo produto em pedidos diferentes e ordena por quantidade", async () => {
    const saleItemFindMany = vi.fn().mockResolvedValue([
      {
        quantity: new Prisma.Decimal(2),
        total: 4000,
        productId: "prod-a",
        product: { name: "Produto A", sku: "SKU-A" },
      },
      {
        quantity: new Prisma.Decimal(3),
        total: 6000,
        productId: "prod-a",
        product: { name: "Produto A", sku: "SKU-A" },
      },
      {
        quantity: new Prisma.Decimal(10),
        total: 2000,
        productId: "prod-b",
        product: { name: "Produto B", sku: "SKU-B" },
      },
    ]);
    const service = buildService({ saleItemFindMany });

    const result = await service.dashboard(TENANT_ID, PERIOD);

    expect(result.topProducts).toEqual([
      { productId: "prod-b", name: "Produto B", sku: "SKU-B", quantitySold: 10, revenue: 2000 },
      { productId: "prod-a", name: "Produto A", sku: "SKU-A", quantitySold: 5, revenue: 10000 },
    ]);
  });
});
