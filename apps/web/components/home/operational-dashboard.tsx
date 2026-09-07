"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@orbix/ui";
import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/client";
import { getDashboard } from "@/lib/api/reports";
import { todayRange } from "@/lib/date-range";
import { formatCentsToBRL } from "@/lib/format";

// docs/05-permissoes-rbac.md (5.6): dashboard operacional do MANAGER. Reaproveita
// o mesmo GET /v1/reports/dashboard do painel executivo, só filtrado no dia de
// hoje. "Pedidos de compra pendentes" (mock original) foi removido — não existe
// entidade de pedido de compra no schema (lacuna já sinalizada na tela de Compras).
export function OperationalDashboard() {
  const { from, to } = todayRange();
  const dashboardQuery = useQuery({
    queryKey: ["reports-dashboard", from, to],
    queryFn: () => getDashboard(from, to),
  });

  if (dashboardQuery.isError) {
    const message =
      dashboardQuery.error instanceof ApiError
        ? dashboardQuery.error.message
        : "Erro ao carregar o painel operacional.";
    return <p className="text-sm text-destructive">{message}</p>;
  }

  const data = dashboardQuery.data;
  const cards = [
    { label: "Vendas hoje", value: data ? formatCentsToBRL(data.revenue) : "—" },
    { label: "Caixas abertos", value: data ? String(data.openCashRegistersCount) : "—" },
    { label: "Produtos com estoque crítico", value: data ? String(data.criticalStockCount) : "—" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardTitle>{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
