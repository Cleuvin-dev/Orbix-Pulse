import type { FinanceEntryStatus, FinanceEntryType } from "@orbix/types";

// MOCK — reflete `finance_entries` (docs/03-modelo-dados.md, 3.3). Contas a
// pagar/receber reais e DRE calculado chegam na Fase 7 do roadmap.
export interface MockEntry {
  id: string;
  type: FinanceEntryType;
  category: string;
  description: string;
  amountCents: number;
  dueDate: string;
  status: FinanceEntryStatus;
}

export const MOCK_ENTRIES: MockEntry[] = [
  {
    id: "1",
    type: "RECEIVABLE",
    category: "Vendas a prazo",
    description: "Venda #1038 — cartão parcelado",
    amountCents: 45900,
    dueDate: "05/09",
    status: "PENDING",
  },
  {
    id: "2",
    type: "RECEIVABLE",
    category: "Vendas a prazo",
    description: "Venda #1021 — cartão parcelado",
    amountCents: 12900,
    dueDate: "28/08",
    status: "OVERDUE",
  },
  {
    id: "3",
    type: "RECEIVABLE",
    category: "Vendas de produtos",
    description: "Fechamento de caixa — 31/08",
    amountCents: 318000,
    dueDate: "31/08",
    status: "PAID",
  },
  {
    id: "4",
    type: "PAYABLE",
    category: "Fornecedores",
    description: "NF 8821 — distribuidora de bebidas",
    amountCents: 189000,
    dueDate: "10/09",
    status: "PENDING",
  },
  {
    id: "5",
    type: "PAYABLE",
    category: "Aluguel",
    description: "Aluguel da loja — setembro",
    amountCents: 320000,
    dueDate: "05/09",
    status: "PENDING",
  },
  {
    id: "6",
    type: "PAYABLE",
    category: "Energia elétrica",
    description: "Conta de luz — agosto",
    amountCents: 42800,
    dueDate: "02/09",
    status: "OVERDUE",
  },
  {
    id: "7",
    type: "PAYABLE",
    category: "Salários",
    description: "Folha de pagamento — agosto",
    amountCents: 680000,
    dueDate: "30/08",
    status: "PAID",
  },
  {
    id: "8",
    type: "PAYABLE",
    category: "Fornecedores",
    description: "NF 8790 — mercearia atacado",
    amountCents: 95000,
    dueDate: "20/08",
    status: "CANCELLED",
  },
];

export const ENTRY_STATUS_LABELS: Record<FinanceEntryStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
};
