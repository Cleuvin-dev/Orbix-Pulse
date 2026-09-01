import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@orbix/ui";
import type { StockMovementType } from "@orbix/types";

import { MOCK_PRODUCTS } from "@/app/produtos/mock-products";

import { MOCK_MOVEMENTS, MOVEMENT_TYPE_LABELS } from "./mock-movements";

// Saída de estoque (quantidade negativa) recebe destaque; entrada fica neutra.
const MOVEMENT_BADGE_VARIANT: Record<StockMovementType, "secondary" | "destructive" | "outline"> = {
  ENTRADA: "secondary",
  COMPRA: "secondary",
  DEVOLUCAO: "secondary",
  SAIDA: "destructive",
  VENDA: "destructive",
  AJUSTE: "outline",
  TRANSFERENCIA: "outline",
};

export default function EstoquePage() {
  const lowStock = MOCK_PRODUCTS.filter((product) => product.currentStock <= product.minimumStock);
  const activeSkus = MOCK_PRODUCTS.filter((product) => product.isActive).length;
  const movementsToday = MOCK_MOVEMENTS.filter((movement) => movement.createdAt.startsWith("hoje")).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Estoque</h1>
        <p className="text-sm text-muted-foreground">
          Estoque atual é sempre a soma das movimentações — dados de demonstração.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>SKUs ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activeSkus}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Abaixo do estoque mínimo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{lowStock.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Movimentações hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{movementsToday}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-medium">Alertas de estoque mínimo</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Atual</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lowStock.map((product) => (
              <TableRow key={product.sku}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive">
                    {product.currentStock} {product.unit.toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {product.minimumStock} {product.unit.toLowerCase()}
                </TableCell>
              </TableRow>
            ))}
            {lowStock.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum produto abaixo do mínimo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-medium">Movimentações recentes</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Quando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_MOVEMENTS.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="font-medium">{movement.productName}</TableCell>
                <TableCell>
                  <Badge variant={MOVEMENT_BADGE_VARIANT[movement.type]}>
                    {MOVEMENT_TYPE_LABELS[movement.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                </TableCell>
                <TableCell className="text-muted-foreground">{movement.reason}</TableCell>
                <TableCell className="text-muted-foreground">{movement.createdBy}</TableCell>
                <TableCell className="text-muted-foreground">{movement.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
