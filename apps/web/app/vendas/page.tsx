"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@orbix/ui";
import type { PaymentMethod } from "@orbix/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CreditCard, Minus, Plus, QrCode, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { listBranches } from "@/lib/api/branches";
import { currentCashRegister, closeCashRegister, openCashRegister } from "@/lib/api/cash-registers";
import { ApiError } from "@/lib/api/client";
import { listDevices } from "@/lib/api/devices";
import { listProducts, type Product } from "@/lib/api/products";
import { createSale } from "@/lib/api/sales";
import { formatCentsToBRL, reaisInputToCents } from "@/lib/format";

interface CartItem {
  productId: string;
  sku: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

const PAYMENT_OPTIONS: { method: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { method: "CASH", label: "Dinheiro", icon: Banknote },
  { method: "CARD", label: "Cartão", icon: CreditCard },
  { method: "PIX", label: "PIX", icon: QrCode },
];

export default function VendasPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>("CASH");
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cashRegisterQuery = useQuery({
    queryKey: ["cash-register-current"],
    queryFn: currentCashRegister,
  });
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const devicesQuery = useQuery({ queryKey: ["devices"], queryFn: listDevices });
  const productsQuery = useQuery({
    queryKey: ["products", "vendas"],
    queryFn: () => listProducts({ pageSize: 100, isActive: true }),
  });

  const cashRegister = cashRegisterQuery.data ?? null;
  const branchId = branchesQuery.data?.[0]?.id;
  const deviceId = devicesQuery.data?.[0]?.id;

  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = productsQuery.data?.items ?? [];
    if (!term) return items;
    return items.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term),
    );
  }, [productsQuery.data, search]);

  const openMutation = useMutation({
    mutationFn: openCashRegister,
    onSuccess: async () => {
      setOpeningAmount("");
      await queryClient.invalidateQueries({ queryKey: ["cash-register-current"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao abrir o caixa."),
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, closingAmountCents }: { id: string; closingAmountCents: number }) =>
      closeCashRegister(id, { closingAmount: closingAmountCents }),
    onSuccess: async () => {
      setClosingAmount("");
      setShowCloseForm(false);
      await queryClient.invalidateQueries({ queryKey: ["cash-register-current"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao fechar o caixa."),
  });

  const saleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: async () => {
      setCart([]);
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Erro ao finalizar a venda."),
  });

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...current,
        { productId: product.id, sku: product.sku, name: product.name, unitPriceCents: product.salePrice, quantity: 1 },
      ];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  const totalCents = cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function handleOpenCashRegister(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!branchId) {
      setError("Nenhuma filial ativa encontrada para este tenant.");
      return;
    }
    openMutation.mutate({
      operationId: crypto.randomUUID(),
      branchId,
      openingAmount: reaisInputToCents(openingAmount),
    });
  }

  function handleCloseCashRegister(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!cashRegister) return;
    closeMutation.mutate({ id: cashRegister.id, closingAmountCents: reaisInputToCents(closingAmount) });
  }

  function handleFinalizeSale() {
    setError(null);
    if (!cashRegister || !branchId || !deviceId || cart.length === 0) return;
    saleMutation.mutate({
      operationId: crypto.randomUUID(),
      branchId,
      deviceId,
      cashRegisterId: cashRegister.id,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPriceCents,
      })),
      payments: [{ method: payment, amount: totalCents }],
    });
  }

  if (cashRegisterQuery.isLoading || branchesQuery.isLoading || devicesQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (!cashRegister) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Vendas</h1>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Abrir caixa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOpenCashRegister} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="opening-amount" className="text-xs font-medium text-muted-foreground">
                  Valor de abertura (R$)
                </label>
                <Input
                  id="opening-amount"
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={openMutation.isPending || !branchId}>
                {openMutation.isPending ? "Abrindo..." : "Abrir caixa"}
              </Button>
              {!branchId && (
                <p className="text-xs text-destructive">Nenhuma filial ativa encontrada para este tenant.</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Vendas</h1>
            <Badge variant="secondary" className="mt-1">
              Caixa aberto desde {new Date(cashRegister.openedAt).toLocaleTimeString("pt-BR")} — abertura{" "}
              {formatCentsToBRL(cashRegister.openingAmount)}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCloseForm((v) => !v)}>
            Fechar caixa
          </Button>
        </div>

        {showCloseForm && (
          <form
            onSubmit={handleCloseCashRegister}
            className="flex items-end gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="closing-amount" className="text-xs font-medium text-muted-foreground">
                Valor de fechamento (R$)
              </label>
              <Input
                id="closing-amount"
                required
                type="number"
                step="0.01"
                min="0"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="w-40"
              />
            </div>
            <Button type="submit" disabled={closeMutation.isPending}>
              {closeMutation.isPending ? "Fechando..." : "Confirmar fechamento"}
            </Button>
          </form>
        )}

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto por nome ou SKU..."
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              data-testid={`product-card-${product.sku}`}
              onClick={() => addToCart(product)}
              className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent"
            >
              <span className="text-sm font-medium">{product.name}</span>
              <span className="text-xs text-muted-foreground">{product.sku}</span>
              <span className="mt-1 font-semibold text-primary">{formatCentsToBRL(product.salePrice)}</span>
            </button>
          ))}
          {products.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          )}
        </div>
      </div>

      <Card className="flex w-full flex-col lg:w-96">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-sm font-medium">Venda atual</h2>
          <Badge variant="outline">{itemCount} itens</Badge>
        </div>

        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {cart.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Toque em um produto para adicionar à venda.
            </p>
          )}
          {cart.map((item) => (
            <div key={item.productId} className="flex items-center justify-between gap-2 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{formatCentsToBRL(item.unitPriceCents)} un.</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => changeQuantity(item.productId, -1)}
                  aria-label={`Diminuir quantidade de ${item.name}`}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => changeQuantity(item.productId, 1)}
                  aria-label={`Aumentar quantidade de ${item.name}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <span className="w-20 text-right text-sm font-medium">
                {formatCentsToBRL(item.unitPriceCents * item.quantity)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => removeItem(item.productId)}
                aria-label={`Remover ${item.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCentsToBRL(totalCents)}</span>
          </div>
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatCentsToBRL(totalCents)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map(({ method, label, icon: Icon }) => (
              <button
                key={method}
                type="button"
                onClick={() => setPayment(method)}
                className={`flex flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors ${
                  payment === method
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            size="lg"
            disabled={cart.length === 0 || saleMutation.isPending || !deviceId}
            onClick={handleFinalizeSale}
          >
            {saleMutation.isPending ? "Finalizando..." : "Finalizar venda"}
          </Button>
          {!deviceId && (
            <p className="text-xs text-destructive">Nenhum dispositivo ativo encontrado para este tenant.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
