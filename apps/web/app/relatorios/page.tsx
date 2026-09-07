"use client";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@orbix/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import { getDre } from "@/lib/api/finance";
import { getDashboard } from "@/lib/api/reports";
import { listStockAlerts } from "@/lib/api/stock";
import { currentMonthRange } from "@/lib/date-range";
import { formatCentsToBRL } from "@/lib/format";

function PermissionNotice({ error }: { error: unknown }) {
  const message = error instanceof ApiError ? error.message : "Erro ao carregar este relatório.";
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

export default function RelatoriosPage() {
  const defaultRange = currentMonthRange();
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  const dashboardQuery = useQuery({
    queryKey: ["reports-dashboard", from, to],
    queryFn: () => getDashboard(from, to),
  });
  const dreQuery = useQuery({
    queryKey: ["finance-dre", from, to],
    queryFn: () => getDre(from, to),
  });
  const alertsQuery = useQuery({ queryKey: ["stock-alerts"], queryFn: listStockAlerts });

  const dashboard = dashboardQuery.data;
  const kpis = [
    { label: "Faturamento", value: dashboard ? formatCentsToBRL(dashboard.revenue) : "—" },
    { label: "Lucro bruto", value: dashboard ? formatCentsToBRL(dashboard.profit) : "—" },
    { label: "Margem", value: dashboard ? `${dashboard.marginPct.toFixed(1)}%` : "—" },
    { label: "Ticket médio", value: dashboard ? formatCentsToBRL(dashboard.averageTicket) : "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Faturamento, lucro, margem, top produtos e estoque crítico (docs/01-visao-produto.md, 1.3).
        </p>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-from" className="text-xs font-medium text-muted-foreground">
            De
          </label>
          <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="report-to" className="text-xs font-medium text-muted-foreground">
            Até
          </label>
          <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {dashboardQuery.isError ? (
        <PermissionNotice error={dashboardQuery.error} />
      ) : (
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
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isError ? (
              <PermissionNotice error={dashboardQuery.error} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dashboard?.topProducts ?? []).map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{product.quantitySold}</TableCell>
                      <TableCell className="text-right">{formatCentsToBRL(product.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  {dashboard && dashboard.topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        Nenhuma venda no período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estoque crítico</CardTitle>
          </CardHeader>
          <CardContent>
            {alertsQuery.isError ? (
              <PermissionNotice error={alertsQuery.error} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Atual</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(alertsQuery.data ?? []).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{product.currentStock}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{product.minimumStock}</TableCell>
                    </TableRow>
                  ))}
                  {!alertsQuery.isLoading && (alertsQuery.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum produto abaixo do mínimo.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DRE do período</CardTitle>
        </CardHeader>
        <CardContent>
          {dreQuery.isError ? (
            <PermissionNotice error={dreQuery.error} />
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              {dreQuery.data && (
                <>
                  <div>
                    <dt className="text-muted-foreground">Receita bruta</dt>
                    <dd className="font-medium">{formatCentsToBRL(dreQuery.data.grossRevenue)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Impostos</dt>
                    <dd className="font-medium">{formatCentsToBRL(dreQuery.data.taxes)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Receita líquida</dt>
                    <dd className="font-medium">{formatCentsToBRL(dreQuery.data.netRevenue)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">CMV</dt>
                    <dd className="font-medium">{formatCentsToBRL(dreQuery.data.costOfGoodsSold)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Lucro bruto</dt>
                    <dd className="font-medium">{formatCentsToBRL(dreQuery.data.grossProfit)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Despesas operacionais</dt>
                    <dd className="font-medium">{formatCentsToBRL(dreQuery.data.operatingExpenses)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Lucro operacional</dt>
                    <dd className="font-medium">{formatCentsToBRL(dreQuery.data.operatingProfit)}</dd>
                  </div>
                </>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Relatório de compras fica fora desta fase — não existe entidade de pedido de compra no modelo de
          dados ainda (lacuna sinalizada na tela de Compras).
        </CardContent>
      </Card>
    </div>
  );
}
