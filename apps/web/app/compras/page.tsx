"use client";

import { Badge, Button, Card, CardContent, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@orbix/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { ApiError } from "@/lib/api/client";
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
  type Supplier,
} from "@/lib/api/suppliers";

interface SupplierFormState {
  id: string | null; // null = criando, string = editando
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

const EMPTY_FORM: SupplierFormState = {
  id: null,
  name: "",
  document: "",
  email: "",
  phone: "",
  address: "",
  isActive: true,
};

export default function ComprasPage() {
  const [form, setForm] = useState<SupplierFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers });

  function invalidateSuppliers() {
    return queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  }

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: async () => {
      await invalidateSuppliers();
      setForm(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Erro ao salvar."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof updateSupplier>[1]) =>
      updateSupplier(id, input),
    onSuccess: async () => {
      await invalidateSuppliers();
      setForm(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Erro ao salvar."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: invalidateSuppliers,
  });

  function openCreateForm() {
    setFormError(null);
    setForm(EMPTY_FORM);
  }

  function openEditForm(supplier: Supplier) {
    setFormError(null);
    setForm({
      id: supplier.id,
      name: supplier.name,
      document: supplier.document ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      isActive: supplier.isActive,
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      document: form.document.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      isActive: form.isActive,
    };

    if (form.id) {
      updateMutation.mutate({ id: form.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(supplier: Supplier) {
    if (!window.confirm(`Excluir "${supplier.name}"? Isso não pode ser desfeito.`)) return;
    deleteMutation.mutate(supplier.id);
  }

  const suppliers = suppliersQuery.data ?? [];
  const saving = createMutation.isPending || updateMutation.isPending;
  const errorMessage =
    suppliersQuery.error instanceof ApiError ? suppliersQuery.error.message : "Erro ao carregar fornecedores.";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Compras</h1>
        <p className="text-sm text-muted-foreground">Fornecedores e pedidos de compra.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">Fornecedores</h2>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4" />
          Novo fornecedor
        </Button>
      </div>

      {form && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{form.id ? "Editar fornecedor" : "Novo fornecedor"}</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setForm(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label htmlFor="supplier-name" className="text-xs font-medium text-muted-foreground">
                Nome
              </label>
              <Input
                id="supplier-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-document" className="text-xs font-medium text-muted-foreground">
                CNPJ
              </label>
              <Input
                id="supplier-document"
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-email" className="text-xs font-medium text-muted-foreground">
                E-mail
              </label>
              <Input
                id="supplier-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-phone" className="text-xs font-medium text-muted-foreground">
                Telefone
              </label>
              <Input
                id="supplier-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3">
              <label htmlFor="supplier-address" className="text-xs font-medium text-muted-foreground">
                Endereço
              </label>
              <Input
                id="supplier-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <input
                id="supplier-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="supplier-active" className="text-sm">
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

      <div className="rounded-lg border border-border bg-card">
        {suppliersQuery.isError ? (
          <p className="p-4 text-sm text-destructive">{errorMessage}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {supplier.document ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{supplier.email ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{supplier.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "outline" : "secondary"}>
                      {supplier.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${supplier.name}`}
                        onClick={() => openEditForm(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Excluir ${supplier.name}`}
                        onClick={() => handleDelete(supplier)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!suppliersQuery.isLoading && suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum fornecedor cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Pedidos de compra</h2>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Pedidos de compra e entrada de NF ainda não têm modelo de dados definido em{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/03-modelo-dados.md</code>.
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Essa é uma lacuna real do blueprint, não só uma tela pendente — precisa ser desenhada
              (nova entidade de banco) antes de virar funcionalidade, conforme{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">CLAUDE.md</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
