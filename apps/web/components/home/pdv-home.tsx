import { Button, Card, CardContent } from "@orbix/ui";

// MOCK — tela inicial de CASHIER/SELLER é o PDV (docs/05-permissoes-rbac.md, 5.6).
// A venda de verdade (PDV → estoque → financeiro) é Fase 6.
export function PdvHome() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <p className="text-center text-sm text-muted-foreground">
            Nenhuma venda em andamento
          </p>
          <Button size="lg" className="w-full" disabled>
            Nova venda
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            PDV funcional chega na Fase 6 do roadmap.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
