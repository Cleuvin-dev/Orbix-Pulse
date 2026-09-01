import { Card, CardContent, CardHeader, CardTitle } from "@orbix/ui";

// MOCK — visão financeira (docs/04-regras-negocio.md, 4.6: DRE simplificado).
const DRE = [
  { label: "Receita bruta", value: "R$ 48.320,00" },
  { label: "Custo das mercadorias vendidas", value: "R$ 22.100,00" },
  { label: "Lucro bruto", value: "R$ 26.220,00" },
  { label: "Despesas operacionais", value: "R$ 8.280,00" },
  { label: "Lucro operacional", value: "R$ 17.940,00" },
];

export function FinanceHome() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>DRE simplificado (mês atual)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {DRE.map((line) => (
          <div key={line.label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-medium">{line.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
