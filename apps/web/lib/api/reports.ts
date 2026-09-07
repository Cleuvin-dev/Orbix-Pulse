import { apiClient } from "./client";

// GET /v1/reports/dashboard (docs/12-roadmap-fases.md, Fase 11 —
// docs/01-visao-produto.md, 1.3: "faturamento, lucro, margem, top produtos,
// estoque crítico"). Agregação de leitura, sem tabela própria.
export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
  revenue: number;
}

export interface DashboardReport {
  from: string;
  to: string;
  revenue: number;
  profit: number;
  marginPct: number;
  salesCount: number;
  averageTicket: number;
  criticalStockCount: number;
  openCashRegistersCount: number;
  topProducts: TopProduct[];
}

export function getDashboard(from: string, to: string) {
  const query = new URLSearchParams({ from, to });
  return apiClient.get<DashboardReport>(`/v1/reports/dashboard?${query.toString()}`);
}
