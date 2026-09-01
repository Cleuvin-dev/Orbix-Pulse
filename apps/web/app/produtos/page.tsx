"use client";

import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@orbix/ui";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { formatCentsToBRL } from "@/lib/format";

import { MOCK_PRODUCTS } from "./mock-products";

export default function ProdutosPage() {
  const [search, setSearch] = useState("");

  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return MOCK_PRODUCTS;
    return MOCK_PRODUCTS.filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term),
    );
  }, [search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {MOCK_PRODUCTS.length} produtos cadastrados — dados de demonstração.
          </p>
        </div>
        <Button disabled title="CRUD real chega na Fase 4 do roadmap">
          <Plus className="h-4 w-4" />
          Novo produto
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou SKU..."
          className="pl-9"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Un.</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const lowStock = product.currentStock <= product.minimumStock;
              return (
                <TableRow key={product.sku}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.sku}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right">
                    {formatCentsToBRL(product.costPriceCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCentsToBRL(product.salePriceCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={lowStock ? "destructive" : "secondary"}>
                      {product.currentStock} {product.unit.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "outline" : "secondary"}>
                      {product.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
