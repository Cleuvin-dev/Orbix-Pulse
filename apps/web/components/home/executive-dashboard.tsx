"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@orbix/ui";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import { getDashboard } from "@/lib/api/reports";
import { currentMonthRange } from "@/lib/date-range";
import { formatCentsToBRL } from "@/lib/format";

// docs/01-visao-produto.md (1.3): "faturamento, lucro, margem, estoque
// crítico" — dados reais via GET /v1/reports/dashboard (Fase 11).
export function ExecutiveDashboard() {
  const { from, to } = currentMonthRange();
  const dashboardQuery = useQuery({
    queryKey: ["reports-dashboard", from, to],
    queryFn: () => getDashboard(from, to),
  });

  if (dashboardQuery.isError) {
    const message =
      dashboardQuery.error instanceof ApiError
        ? dashboardQuery.error.message
        : "Erro ao carregar o painel executivo.";
    return <p className="text-sm text-destructive">{message}</p>;
  }

  const data = dashboardQuery.data;
  const kpis = [
    { label: "Faturamento (mês)", value: data ? formatCentsToBRL(data.revenue) : "—" },
    { label: "Lucro bruto", value: data ? formatCentsToBRL(data.profit) : "—" },
    { label: "Margem média", value: data ? `${data.marginPct.toFixed(1)}%` : "—" },
    { label: "Produtos com estoque crítico", value: data ? String(data.criticalStockCount) : "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardTitle>{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos mais vendidos (mês)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(data?.topProducts ?? []).map((product) => (
            <div key={product.productId} className="flex items-center justify-between text-sm">
              <span>{product.name}</span>
              <Badge variant="secondary">{product.quantitySold} un.</Badge>
            </div>
          ))}
          {data && data.topProducts.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada neste período.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
