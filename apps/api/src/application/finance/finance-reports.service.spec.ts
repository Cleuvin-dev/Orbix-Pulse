import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { FinanceReportsService } from "./finance-reports.service";

const TENANT_ID = "tenant-1";
const PERIOD = { from: new Date("2026-09-01"), to: new Date("2026-09-30") };

describe("FinanceReportsService", () => {
  it("cashFlow: inflow = vendas + recebíveis pagos; outflow = pagáveis pagos", async () => {
    const paymentAggregate = vi.fn().mockResolvedValue({ _sum: { amount: 10000 } });
    const financeEntryAggregate = vi
      .fn()
      .mockResolvedValueOnce({ _sum: { amount: 2000 } }) // receivablesInflow
      .mockResolvedValueOnce({ _sum: { amount: 3000 } }); // payablesOutflow

    const prisma = {
      payment: { aggregate: paymentAggregate },
      financeEntry: { aggregate: financeEntryAggregate },
    } as unknown as PrismaService;
    const service = new FinanceReportsService(prisma);

    const result = await service.cashFlow(TENANT_ID, PERIOD);

    expect(result.inflow).toBe(12000); // 10000 + 2000
    expect(result.outflow).toBe(3000);
    expect(result.net).toBe(9000);
  });

  it("cashFlow: trata ausência de dados (_sum null) como zero", async () => {
    const paymentAggregate = vi.fn().mockResolvedValue({ _sum: { amount: null } });
    const financeEntryAggregate = vi.fn().mockResolvedValue({ _sum: { amount: null } });

    const prisma = {
      payment: { aggregate: paymentAggregate },
      financeEntry: { aggregate: financeEntryAggregate },
    } as unknown as PrismaService;
    const service = new FinanceReportsService(prisma);

    const result = await service.cashFlow(TENANT_ID, PERIOD);

    expect(result).toMatchObject({ inflow: 0, outflow: 0, net: 0 });
  });

  it("dre: calcula a cascata Receita Bruta -> Lucro Operacional corretamente", async () => {
    const saleAggregate = vi.fn().mockResolvedValue({ _sum: { totalAmount: 100000 } }); // receita de vendas
    const saleItemFindMany = vi.fn().mockResolvedValue([
      { quantity: new Prisma.Decimal(10), product: { costPrice: 3000 } }, // 30000
      { quantity: new Prisma.Decimal(5), product: { costPrice: 2000 } }, // 10000
    ]); // CMV das vendas = 40000
    const financeEntryAggregate = vi
      .fn()
      .mockResolvedValueOnce({ _sum: { amount: 5000 } }) // revenueEntries (REVENUE)
      .mockResolvedValueOnce({ _sum: { amount: 1000 } }) // costEntries (COST)
      .mockResolvedValueOnce({ _sum: { amount: 20000 } }); // expenseEntries (EXPENSE)

    const prisma = {
      sale: { aggregate: saleAggregate },
      saleItem: { findMany: saleItemFindMany },
      financeEntry: { aggregate: financeEntryAggregate },
    } as unknown as PrismaService;
    const service = new FinanceReportsService(prisma);

    const result = await service.dre(TENANT_ID, PERIOD);

    expect(result.grossRevenue).toBe(105000); // 100000 vendas + 5000 outras receitas
    expect(result.taxes).toBe(0);
    expect(result.netRevenue).toBe(105000);
    expect(result.costOfGoodsSold).toBe(41000); // 40000 CMV vendas + 1000 custo extra
    expect(result.grossProfit).toBe(64000); // 105000 - 41000
    expect(result.operatingExpenses).toBe(20000);
    expect(result.operatingProfit).toBe(44000); // 64000 - 20000
  });

  it("dre: período sem nenhuma venda/lançamento dá tudo zero, sem quebrar", async () => {
    const saleAggregate = vi.fn().mockResolvedValue({ _sum: { totalAmount: null } });
    const saleItemFindMany = vi.fn().mockResolvedValue([]);
    const financeEntryAggregate = vi.fn().mockResolvedValue({ _sum: { amount: null } });

    const prisma = {
      sale: { aggregate: saleAggregate },
      saleItem: { findMany: saleItemFindMany },
      financeEntry: { aggregate: financeEntryAggregate },
    } as unknown as PrismaService;
    const service = new FinanceReportsService(prisma);

    const result = await service.dre(TENANT_ID, PERIOD);

    expect(result).toMatchObject({
      grossRevenue: 0,
      netRevenue: 0,
      costOfGoodsSold: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      operatingProfit: 0,
    });
  });
});
