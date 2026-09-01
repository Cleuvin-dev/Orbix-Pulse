"use client";

import {
  Badge,
  Button,
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
import type { FinanceEntryStatus, FinanceEntryType } from "@orbix/types";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { formatCentsToBRL } from "@/lib/format";

import { ENTRY_STATUS_LABELS, MOCK_ENTRIES } from "./mock-entries";

const STATUS_BADGE_VARIANT: Record<FinanceEntryStatus, "outline" | "secondary" | "destructive"> = {
  PENDING: "outline",
  PAID: "secondary",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

type Filter = "ALL" | FinanceEntryType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "RECEIVABLE", label: "A receber" },
  { value: "PAYABLE", label: "A pagar" },
];

export default function FinanceiroPage() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const entries = useMemo(
    () => (filter === "ALL" ? MOCK_ENTRIES : MOCK_ENTRIES.filter((entry) => entry.type === filter)),
    [filter],
  );

  const openReceivable = MOCK_ENTRIES.filter(
    (entry) => entry.type === "RECEIVABLE" && (entry.status === "PENDING" || entry.status === "OVERDUE"),
  ).reduce((sum, entry) => sum + entry.amountCents, 0);

  const openPayable = MOCK_ENTRIES.filter(
    (entry) => entry.type === "PAYABLE" && (entry.status === "PENDING" || entry.status === "OVERDUE"),
  ).reduce((sum, entry) => sum + entry.amountCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Contas a pagar e a receber — dados de demonstração.
          </p>
        </div>
        <Button disabled title="Lançamento real chega na Fase 7 do roadmap">
          <Plus className="h-4 w-4" />
          Novo lançamento
        </Button>
      </div>

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
            <p className="text-2xl font-semibold">
              {formatCentsToBRL(openReceivable - openPayable)}
            </p>
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
                <TableCell>{entry.category}</TableCell>
                <TableCell className="text-muted-foreground">{entry.dueDate}</TableCell>
                <TableCell
                  className={`text-right ${entry.type === "RECEIVABLE" ? "text-pulse-online" : "text-pulse-offline"}`}
                >
                  {entry.type === "RECEIVABLE" ? "+" : "-"}
                  {formatCentsToBRL(entry.amountCents)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[entry.status]}>
                    {ENTRY_STATUS_LABELS[entry.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
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
