import { Badge, Card, CardContent, CardHeader, CardTitle } from "@orbix/ui";

// MOCK — alertas de estoque mínimo (docs/04-regras-negocio.md, 4.4).
const LOW_STOCK = [
  { name: "Óleo de soja 900ml", current: 3, minimum: 10 },
  { name: "Detergente 500ml", current: 5, minimum: 15 },
  { name: "Arroz 5kg", current: 8, minimum: 20 },
];

export function StockHome() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos com estoque abaixo do mínimo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {LOW_STOCK.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <span>{item.name}</span>
            <Badge variant="destructive">
              {item.current} / {item.minimum} un.
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
