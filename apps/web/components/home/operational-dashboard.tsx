import { Card, CardContent, CardHeader, CardTitle } from "@orbix/ui";

// MOCK — dashboard operacional do gerente (docs/05-permissoes-rbac.md, 5.6).
const CARDS = [
  { label: "Vendas hoje", value: "R$ 3.180,00" },
  { label: "Caixas abertos", value: "2 de 2" },
  { label: "Pedidos de compra pendentes", value: "4" },
];

export function OperationalDashboard() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CARDS.map((card) => (
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
