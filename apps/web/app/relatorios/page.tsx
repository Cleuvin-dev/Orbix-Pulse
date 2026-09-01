import { Badge, Card, CardContent, CardHeader, CardTitle } from "@orbix/ui";
import { BarChart3, Boxes, ShoppingCart, Wallet } from "lucide-react";

// MOCK — galeria de relatórios. Conteúdo real é Fase 11 do roadmap
// (docs/12-roadmap-fases.md), sobre dados reais de vendas/estoque/financeiro.
const REPORTS = [
  {
    key: "vendas",
    icon: ShoppingCart,
    title: "Vendas por período",
    description: "Faturamento, ticket médio e comparação entre períodos.",
  },
  {
    key: "produtos",
    icon: Boxes,
    title: "Produtos mais vendidos",
    description: "Ranking por quantidade e por receita, filtrável por categoria.",
  },
  {
    key: "estoque",
    icon: Boxes,
    title: "Giro de estoque",
    description: "Produtos parados, risco de ruptura e sugestão de compra.",
  },
  {
    key: "financeiro",
    icon: Wallet,
    title: "DRE",
    description: "Demonstrativo de resultado por período (docs/04-regras-negocio.md, 4.6).",
  },
];

export default function RelatoriosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Dados agregados chegam na Fase 11 do roadmap — abaixo, os relatórios planejados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.key} className="opacity-80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <Badge variant="outline">Em breve</Badge>
                </div>
                <CardTitle className="pt-2 text-base font-semibold text-foreground">
                  {report.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            O painel executivo do Dashboard (para OWNER/ADMIN) já mostra uma prévia com dados
            fictícios dessas métricas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
