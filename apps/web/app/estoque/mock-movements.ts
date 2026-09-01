import type { StockMovementType } from "@orbix/types";

// MOCK — reflete `stock_movements` (docs/03-modelo-dados.md, 3.3): livro-razão
// append-only, nunca editado. Movimentação real chega na Fase 5 do roadmap.
export interface MockMovement {
  id: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export const MOCK_MOVEMENTS: MockMovement[] = [
  {
    id: "1",
    productName: "Refrigerante 2L",
    type: "VENDA",
    quantity: -3,
    reason: "Venda #1042",
    createdBy: "Usuário Caixa",
    createdAt: "hoje, 14:32",
  },
  {
    id: "2",
    productName: "Óleo de soja 900ml",
    type: "VENDA",
    quantity: -1,
    reason: "Venda #1041",
    createdBy: "Usuário Caixa",
    createdAt: "hoje, 14:10",
  },
  {
    id: "3",
    productName: "Arroz 5kg",
    type: "COMPRA",
    quantity: 24,
    reason: "Recebimento NF 8821",
    createdBy: "Usuário Estoquista",
    createdAt: "hoje, 09:15",
  },
  {
    id: "4",
    productName: "Detergente 500ml",
    type: "AJUSTE",
    quantity: -2,
    reason: "Contagem de inventário — divergência",
    createdBy: "Usuário Estoquista",
    createdAt: "ontem, 18:40",
  },
  {
    id: "5",
    productName: "Pão francês",
    type: "DEVOLUCAO",
    quantity: 1,
    reason: "Devolução de cliente",
    createdBy: "Usuário Caixa",
    createdAt: "ontem, 16:05",
  },
  {
    id: "6",
    productName: "Água mineral 500ml",
    type: "TRANSFERENCIA",
    quantity: -10,
    reason: "Transferência para filial Centro",
    createdBy: "Usuário Estoquista",
    createdAt: "ontem, 11:20",
  },
  {
    id: "7",
    productName: "Café 500g",
    type: "ENTRADA",
    quantity: 20,
    reason: "Recebimento NF 8790",
    createdBy: "Usuário Estoquista",
    createdAt: "2 dias atrás",
  },
];

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  DEVOLUCAO: "Devolução",
  AJUSTE: "Ajuste",
  TRANSFERENCIA: "Transferência",
  VENDA: "Venda",
  COMPRA: "Compra",
};
