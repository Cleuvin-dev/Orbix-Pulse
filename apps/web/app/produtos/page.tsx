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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { formatCentsToBRL, reaisInputToCents } from "@/lib/format";
import { ApiError } from "@/lib/api/client";
import {
  createProduct,
  deleteProduct,
  listProductCategories,
  listProducts,
  updateProduct,
  type Product,
} from "@/lib/api/products";

interface ProductFormState {
  id: string | null; // null = criando, string = editando
  sku: string;
  name: string;
  categoryId: string;
  unit: string;
  costPrice: string; // reais, string pra edição livre no input
  salePrice: string;
  minimumStock: string;
  isActive: boolean;
}

const EMPTY_FORM: ProductFormState = {
  id: null,
  sku: "",
  name: "",
  categoryId: "",
  unit: "UN",
  costPrice: "",
  salePrice: "",
  minimumStock: "",
  isActive: true,
};

export default function ProdutosPage() {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["products", search],
    queryFn: () => listProducts({ search: search || undefined, pageSize: 100 }),
  });
  const categoriesQuery = useQuery({
    queryKey: ["product-categories"],
    queryFn: listProductCategories,
  });

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categoriesQuery.data ?? []) map.set(category.id, category.name);
    return map;
  }, [categoriesQuery.data]);

  function invalidateProducts() {
    return queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      await invalidateProducts();
      setForm(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Erro ao salvar."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof updateProduct>[1]) =>
      updateProduct(id, input),
    onSuccess: async () => {
      await invalidateProducts();
      setForm(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Erro ao salvar."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: invalidateProducts,
  });

  function openCreateForm() {
    setFormError(null);
    setForm(EMPTY_FORM);
  }

  function openEditForm(product: Product) {
    setFormError(null);
    setForm({
      id: product.id,
      sku: product.sku,
      name: product.name,
      categoryId: product.categoryId ?? "",
      unit: product.unit,
      costPrice: (product.costPrice / 100).toString(),
      salePrice: (product.salePrice / 100).toString(),
      minimumStock: product.minimumStock ?? "",
      isActive: product.isActive,
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setFormError(null);

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      categoryId: form.categoryId || null,
      unit: form.unit.trim(),
      costPrice: reaisInputToCents(form.costPrice),
      salePrice: reaisInputToCents(form.salePrice),
      minimumStock: form.minimumStock ? Number(form.minimumStock) : null,
      isActive: form.isActive,
    };

    if (form.id) {
      updateMutation.mutate({ id: form.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(product: Product) {
    if (!window.confirm(`Excluir "${product.name}"? Isso não pode ser desfeito.`)) return;
    deleteMutation.mutate(product.id);
  }

  const products = productsQuery.data?.items ?? [];
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {productsQuery.isLoading
              ? "Carregando..."
              : `${productsQuery.data?.total ?? 0} produtos cadastrados.`}
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          Novo produto
        </Button>
      </div>

      {form && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{form.id ? "Editar produto" : "Novo produto"}</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setForm(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-sku" className="text-xs font-medium text-muted-foreground">
                SKU
              </label>
              <Input
                id="product-sku"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <label htmlFor="product-name" className="text-xs font-medium text-muted-foreground">
                Nome
              </label>
              <Input
                id="product-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-category" className="text-xs font-medium text-muted-foreground">
                Categoria
              </label>
              <select
                id="product-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Sem categoria</option>
                {(categoriesQuery.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-unit" className="text-xs font-medium text-muted-foreground">
                Unidade
              </label>
              <Input
                id="product-unit"
                required
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-cost-price" className="text-xs font-medium text-muted-foreground">
                Custo (R$)
              </label>
              <Input
                id="product-cost-price"
                required
                type="number"
                step="0.01"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-sale-price" className="text-xs font-medium text-muted-foreground">
                Preço (R$)
              </label>
              <Input
                id="product-sale-price"
                required
                type="number"
                step="0.01"
                min="0"
                value={form.salePrice}
                onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-minimum-stock" className="text-xs font-medium text-muted-foreground">
                Estoque mínimo
              </label>
              <Input
                id="product-minimum-stock"
                type="number"
                min="0"
                value={form.minimumStock}
                onChange={(e) => setForm({ ...form, minimumStock: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm">
                Ativo
              </label>
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
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const currentStock = Number(product.currentStock);
              const minimumStock = product.minimumStock ? Number(product.minimumStock) : null;
              const lowStock = minimumStock !== null && currentStock <= minimumStock;
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {product.sku}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.categoryId ? (categoryNameById.get(product.categoryId) ?? "—") : "—"}
                  </TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell className="text-right">{formatCentsToBRL(product.costPrice)}</TableCell>
                  <TableCell className="text-right">{formatCentsToBRL(product.salePrice)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={lowStock ? "destructive" : "secondary"}>
                      {currentStock} {product.unit.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "outline" : "secondary"}>
                      {product.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${product.name}`}
                        onClick={() => openEditForm(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir ${product.name}`}
                        onClick={() => handleDelete(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!productsQuery.isLoading && products.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
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
