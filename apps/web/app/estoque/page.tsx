"use client";

import {
  Badge,
  Button,
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
import type { CreateStockMovementInput } from "@orbix/validation";
import type { StockMovementType } from "@orbix/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { listBranches } from "@/lib/api/branches";
import { ApiError } from "@/lib/api/client";
import { listProducts } from "@/lib/api/products";
import {
  createStockMovement,
  listStockAlerts,
  listStockMovements,
  reconcileStock,
} from "@/lib/api/stock";

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

const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  DEVOLUCAO: "Devolução",
  AJUSTE: "Ajuste",
  TRANSFERENCIA: "Transferência",
  VENDA: "Venda",
  COMPRA: "Compra",
};

type ManualMovementType = CreateStockMovementInput["type"];

// Tipos aceitos por POST /v1/stock/movements — VENDA/COMPRA/AJUSTE são
// gerados por outros fluxos (Vendas, reconciliação), nunca manualmente aqui
// (docs/04-regras-negocio.md, 4.4).
const MANUAL_MOVEMENT_TYPES: ManualMovementType[] = ["ENTRADA", "SAIDA", "DEVOLUCAO", "TRANSFERENCIA"];

type FormKind = "movement" | "reconciliation";

interface FormState {
  kind: FormKind;
  productId: string;
  type: ManualMovementType;
  quantity: string;
  reason: string;
}

const EMPTY_FORM: FormState = {
  kind: "movement",
  productId: "",
  type: "ENTRADA",
  quantity: "",
  reason: "",
};

export default function EstoquePage() {
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["products", "estoque"],
    queryFn: () => listProducts({ pageSize: 100 }),
  });
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const alertsQuery = useQuery({ queryKey: ["stock-alerts"], queryFn: listStockAlerts });
  const movementsQuery = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => listStockMovements({ pageSize: 20 }),
  });

  const products = productsQuery.data?.items ?? [];
  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of productsQuery.data?.items ?? []) map.set(product.id, product.name);
    return map;
  }, [productsQuery.data]);
  const branchId = branchesQuery.data?.[0]?.id;

  function invalidateStock() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] }),
      queryClient.invalidateQueries({ queryKey: ["stock-alerts"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
    ]);
  }

  const movementMutation = useMutation({
    mutationFn: createStockMovement,
    onSuccess: async () => {
      await invalidateStock();
      setForm(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Erro ao registrar."),
  });

  const reconcileMutation = useMutation({
    mutationFn: reconcileStock,
    onSuccess: async () => {
      await invalidateStock();
      setForm(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Erro ao registrar."),
  });

  function openForm() {
    setFormError(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || !branchId) return;
    setFormError(null);

    if (!form.productId) {
      setFormError("Selecione um produto.");
      return;
    }
    const quantity = Number(form.quantity.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity < 0) {
      setFormError("Quantidade inválida.");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Informe o motivo.");
      return;
    }

    if (form.kind === "movement") {
      movementMutation.mutate({
        operationId: crypto.randomUUID(),
        productId: form.productId,
        branchId,
        type: form.type,
        quantity,
        reason: form.reason.trim(),
      });
    } else {
      reconcileMutation.mutate({
        operationId: crypto.randomUUID(),
        productId: form.productId,
        branchId,
        countedQuantity: quantity,
        reason: form.reason.trim(),
      });
    }
  }

  const alerts = alertsQuery.data ?? [];
  const movements = movementsQuery.data?.items ?? [];
  const activeSkus = products.filter((product) => product.isActive).length;
  const saving = movementMutation.isPending || reconcileMutation.isPending;
  const noBranch = !branchesQuery.isLoading && !branchId;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Estoque</h1>
          <p className="text-sm text-muted-foreground">
            Estoque atual é sempre a soma das movimentações (livro-razão append-only).
          </p>
        </div>
        <Button onClick={openForm} disabled={noBranch}>
          <Plus className="h-4 w-4" />
          Nova movimentação
        </Button>
      </div>

      {noBranch && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Nenhuma filial ativa encontrada para este tenant — não é possível registrar movimentações.
        </p>
      )}

      {form && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Nova movimentação</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setForm(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="movement-kind" className="text-xs font-medium text-muted-foreground">
                Operação
              </label>
              <select
                id="movement-kind"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value as FormKind })}
              >
                <option value="movement">Movimentação manual</option>
                <option value="reconciliation">Reconciliação (contagem física)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="movement-product" className="text-xs font-medium text-muted-foreground">
                Produto
              </label>
              <select
                id="movement-product"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>
            {form.kind === "movement" && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="movement-type" className="text-xs font-medium text-muted-foreground">
                  Tipo
                </label>
                <select
                  id="movement-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as ManualMovementType })}
                >
                  {MANUAL_MOVEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {MOVEMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="movement-quantity" className="text-xs font-medium text-muted-foreground">
                {form.kind === "movement" ? "Quantidade" : "Contagem física"}
              </label>
              <Input
                id="movement-quantity"
                required
                type="number"
                step="0.001"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4">
              <label htmlFor="movement-reason" className="text-xs font-medium text-muted-foreground">
                Motivo
              </label>
              <Input
                id="movement-reason"
                required
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      )}

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
            <p className="text-2xl font-semibold">{alerts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Movimentações listadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{movements.length}</p>
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
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Atual</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive">{product.currentStock}</Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{product.minimumStock}</TableCell>
              </TableRow>
            ))}
            {!alertsQuery.isLoading && alerts.length === 0 && (
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
              <TableHead>Quando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="font-medium">
                  {productNameById.get(movement.productId) ?? movement.productId}
                </TableCell>
                <TableCell>
                  <Badge variant={MOVEMENT_BADGE_VARIANT[movement.type]}>
                    {MOVEMENT_TYPE_LABELS[movement.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {Number(movement.quantity) > 0 ? `+${movement.quantity}` : movement.quantity}
                </TableCell>
                <TableCell className="text-muted-foreground">{movement.reason ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(movement.createdAt).toLocaleString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
            {!movementsQuery.isLoading && movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma movimentação registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
