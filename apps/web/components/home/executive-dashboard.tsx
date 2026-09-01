import { Badge, Card, CardContent, CardHeader, CardTitle } from "@orbix/ui";

// MOCK — números fixos só para visualização de layout (docs/01-visao-produto.md, 1.3:
// "faturamento, lucro, margem, estoque crítico"). Cálculo real é Fase 11 (Relatórios).
const KPIS = [
  { label: "Faturamento (mês)", value: "R$ 48.320,00" },
  { label: "Lucro bruto", value: "R$ 17.940,00" },
  { label: "Margem média", value: "37,1%" },
  { label: "Produtos com estoque crítico", value: "6" },
];

const TOP_PRODUCTS = [
  { name: "Refrigerante 2L", sold: 312 },
  { name: "Pão francês (kg)", sold: 287 },
  { name: "Café 500g", sold: 201 },
];

export function ExecutiveDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
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
          <CardTitle>Produtos mais vendidos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {TOP_PRODUCTS.map((product) => (
            <div key={product.name} className="flex items-center justify-between text-sm">
              <span>{product.name}</span>
              <Badge variant="secondary">{product.sold} un.</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
