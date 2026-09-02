"use client";

import { Badge, Button, Card, Input } from "@orbix/ui";
import type { PaymentMethod } from "@orbix/types";
import { Banknote, CreditCard, Minus, Plus, QrCode, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { formatCentsToBRL } from "@/lib/format";
import { DEMO_PRODUCTS } from "@/lib/demo-products";

interface CartItem {
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
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>("CASH");

  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    const active = DEMO_PRODUCTS.filter((product) => product.isActive);
    if (!term) return active;
    return active.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term),
    );
  }, [search]);

  function addToCart(sku: string) {
    const product = DEMO_PRODUCTS.find((item) => item.sku === sku);
    if (!product) return;
    setCart((current) => {
      const existing = current.find((item) => item.sku === sku);
      if (existing) {
        return current.map((item) =>
          item.sku === sku ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...current,
        { sku: product.sku, name: product.name, unitPriceCents: product.salePriceCents, quantity: 1 },
      ];
    });
  }

  function changeQuantity(sku: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => (item.sku === sku ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function removeItem(sku: string) {
    setCart((current) => current.filter((item) => item.sku !== sku));
  }

  const totalCents = cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Vendas</h1>
            <Badge variant="secondary" className="mt-1">
              Caixa aberto desde 08:00 — Usuário Caixa
            </Badge>
          </div>
        </div>

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
              key={product.sku}
              type="button"
              data-testid={`product-card-${product.sku}`}
              onClick={() => addToCart(product.sku)}
              className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent"
            >
              <span className="text-sm font-medium">{product.name}</span>
              <span className="text-xs text-muted-foreground">{product.sku}</span>
              <span className="mt-1 font-semibold text-primary">
                {formatCentsToBRL(product.salePriceCents)}
              </span>
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
            <div key={item.sku} className="flex items-center justify-between gap-2 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCentsToBRL(item.unitPriceCents)} un.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => changeQuantity(item.sku, -1)}
                  aria-label={`Diminuir quantidade de ${item.name}`}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => changeQuantity(item.sku, 1)}
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
                onClick={() => removeItem(item.sku)}
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

          <Button size="lg" disabled={cart.length === 0} title="Venda real chega na Fase 6 do roadmap">
            Finalizar venda
          </Button>
        </div>
      </Card>
    </div>
  );
}
