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
import type { CreateFinanceCategoryInput } from "@orbix/validation";
import type { FinanceCategoryKind, FinanceEntryStatus, FinanceEntryType } from "@orbix/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X, XCircle } from "lucide-react";
import { useState } from "react";

import { formatCentsToBRL, reaisInputToCents } from "@/lib/format";
import { ApiError } from "@/lib/api/client";
import {
  cancelFinanceEntry,
  createFinanceCategory,
  createFinanceEntry,
  listFinanceCategories,
  listFinanceEntries,
  markFinanceEntryPaid,
  type FinanceEntry,
} from "@/lib/api/finance";

const STATUS_BADGE_VARIANT: Record<FinanceEntryStatus, "outline" | "secondary" | "destructive"> = {
  PENDING: "outline",
  PAID: "secondary",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

const ENTRY_STATUS_LABELS: Record<FinanceEntryStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
};

const CATEGORY_KIND_LABELS: Record<FinanceCategoryKind, string> = {
  REVENUE: "Receita",
  COST: "Custo (CMV)",
  EXPENSE: "Despesa",
};

type Filter = "ALL" | FinanceEntryType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "RECEIVABLE", label: "A receber" },
  { value: "PAYABLE", label: "A pagar" },
];

const NEW_CATEGORY_VALUE = "__new__";

interface FormState {
  type: FinanceEntryType;
  categoryId: string;
  newCategoryName: string;
  newCategoryKind: FinanceCategoryKind;
  description: string;
  amount: string;
  dueDate: string;
}

const EMPTY_FORM: FormState = {
  type: "RECEIVABLE",
  categoryId: "",
  newCategoryName: "",
  newCategoryKind: "REVENUE",
  description: "",
  amount: "",
  dueDate: "",
};

export default function FinanceiroPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ["finance-entries", filter],
    queryFn: () => listFinanceEntries({ type: filter === "ALL" ? undefined : filter, pageSize: 100 }),
  });
  const categoriesQuery = useQuery({ queryKey: ["finance-categories"], queryFn: listFinanceCategories });

  function invalidateEntries() {
    return queryClient.invalidateQueries({ queryKey: ["finance-entries"] });
  }

  const categoryMutation = useMutation({
    mutationFn: (input: CreateFinanceCategoryInput) => createFinanceCategory(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance-categories"] }),
  });

  const createMutation = useMutation({
    mutationFn: createFinanceEntry,
    onSuccess: async () => {
      await invalidateEntries();
      setForm(null);
    },
    onError: (error) => setFormError(error instanceof ApiError ? error.message : "Erro ao salvar."),
  });

  const payMutation = useMutation({
    mutationFn: markFinanceEntryPaid,
    onSuccess: invalidateEntries,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelFinanceEntry,
    onSuccess: invalidateEntries,
  });

  function openForm() {
    setFormError(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setFormError(null);

    if (!form.description.trim()) {
      setFormError("Informe a descrição.");
      return;
    }
    const amount = reaisInputToCents(form.amount);
    if (amount <= 0) {
      setFormError("Valor inválido.");
      return;
    }
    if (!form.dueDate) {
      setFormError("Informe o vencimento.");
      return;
    }

    let categoryId = form.categoryId;
    if (categoryId === NEW_CATEGORY_VALUE) {
      if (!form.newCategoryName.trim()) {
        setFormError("Informe o nome da nova categoria.");
        return;
      }
      try {
        const category = await categoryMutation.mutateAsync({
          name: form.newCategoryName.trim(),
          kind: form.newCategoryKind,
        });
        categoryId = category.id;
      } catch (error) {
        setFormError(error instanceof ApiError ? error.message : "Erro ao criar categoria.");
        return;
      }
    }
    if (!categoryId) {
      setFormError("Selecione uma categoria.");
      return;
    }

    createMutation.mutate({
      type: form.type,
      categoryId,
      description: form.description.trim(),
      amount,
      dueDate: new Date(form.dueDate),
    });
  }

  const entries = entriesQuery.data?.items ?? [];
  const openReceivable = entries
    .filter((entry) => entry.type === "RECEIVABLE" && (entry.status === "PENDING" || entry.status === "OVERDUE"))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const openPayable = entries
    .filter((entry) => entry.type === "PAYABLE" && (entry.status === "PENDING" || entry.status === "OVERDUE"))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const saving = createMutation.isPending || categoryMutation.isPending;

  function canAct(entry: FinanceEntry) {
    return entry.status === "PENDING" || entry.status === "OVERDUE";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Contas a pagar e a receber.</p>
        </div>
        <Button onClick={openForm}>
          <Plus className="h-4 w-4" />
          Novo lançamento
        </Button>
      </div>

      {form && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Novo lançamento</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setForm(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="entry-type" className="text-xs font-medium text-muted-foreground">
                Tipo
              </label>
              <select
                id="entry-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as FinanceEntryType })}
              >
                <option value="RECEIVABLE">A receber</option>
                <option value="PAYABLE">A pagar</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="entry-category" className="text-xs font-medium text-muted-foreground">
                Categoria
              </label>
              <select
                id="entry-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {(categoriesQuery.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY_VALUE}>+ Criar nova categoria...</option>
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="entry-description" className="text-xs font-medium text-muted-foreground">
                Descrição
              </label>
              <Input
                id="entry-description"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="entry-amount" className="text-xs font-medium text-muted-foreground">
                Valor (R$)
              </label>
              <Input
                id="entry-amount"
                required
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="entry-due-date" className="text-xs font-medium text-muted-foreground">
                Vencimento
              </label>
              <Input
                id="entry-due-date"
                required
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>

            {form.categoryId === NEW_CATEGORY_VALUE && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-category-name" className="text-xs font-medium text-muted-foreground">
                    Nome da categoria
                  </label>
                  <Input
                    id="new-category-name"
                    value={form.newCategoryName}
                    onChange={(e) => setForm({ ...form, newCategoryName: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-category-kind" className="text-xs font-medium text-muted-foreground">
                    Natureza
                  </label>
                  <select
                    id="new-category-kind"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.newCategoryKind}
                    onChange={(e) =>
                      setForm({ ...form, newCategoryKind: e.target.value as FinanceCategoryKind })
                    }
                  >
                    {(Object.keys(CATEGORY_KIND_LABELS) as FinanceCategoryKind[]).map((kind) => (
                      <option key={kind} value={kind}>
                        {CATEGORY_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
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
            <CardTitle>A receber (em aberto)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCentsToBRL(openReceivable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>A pagar (em aberto)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCentsToBRL(openPayable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCentsToBRL(openReceivable - openPayable)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              filter === item.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell
                  className={`font-medium ${entry.status === "CANCELLED" ? "text-muted-foreground line-through" : ""}`}
                >
                  {entry.description}
                </TableCell>
                <TableCell>{entry.category.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.dueDate).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell
                  className={`text-right ${entry.type === "RECEIVABLE" ? "text-pulse-online" : "text-pulse-offline"}`}
                >
                  {entry.type === "RECEIVABLE" ? "+" : "-"}
                  {formatCentsToBRL(entry.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[entry.status]}>{ENTRY_STATUS_LABELS[entry.status]}</Badge>
                </TableCell>
                <TableCell>
                  {canAct(entry) && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Marcar "${entry.description}" como pago`}
                        disabled={payMutation.isPending}
                        onClick={() => payMutation.mutate(entry.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Cancelar "${entry.description}"`}
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(entry.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!entriesQuery.isLoading && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
