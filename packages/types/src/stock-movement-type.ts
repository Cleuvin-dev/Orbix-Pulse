// Espelha o enum StockMovementType de apps/api/prisma/schema.prisma
// (docs/03-modelo-dados.md, 3.3 — stock_movements).
export const STOCK_MOVEMENT_TYPES = [
  "ENTRADA",
  "SAIDA",
  "DEVOLUCAO",
  "AJUSTE",
  "TRANSFERENCIA",
  "VENDA",
  "COMPRA",
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];
