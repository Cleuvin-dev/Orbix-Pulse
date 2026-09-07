import { BARCODE_TYPES, FINANCE_CATEGORY_KINDS, FINANCE_ENTRY_TYPES, PAYMENT_METHODS, ROLES } from "@orbix/types";
import { z } from "zod";

// Tudo num arquivo só de propósito: um import relativo (ex: "./barcode") sem
// extensão quebra em runtime no apps/api (nest start), porque o Node detecta
// sintaxe ESM (export ... from) no arquivo e usa o resolvedor estrito, que
// exige extensão de arquivo — mesmo sem "type": "module" no package.json.
// packages/types não sofre disso porque só é importado com `import type`
// (apagado em tempo de compilação, nunca vira um require() de verdade).

export const createBarcodeSchema = z.object({
  code: z.string().trim().min(1).max(64),
  type: z.enum(BARCODE_TYPES),
});
export type CreateBarcodeInput = z.infer<typeof createBarcodeSchema>;

export const createProductCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  parentId: z.string().uuid().nullish(),
});
export const updateProductCategorySchema = createProductCategorySchema.partial();
export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;

// docs/03-modelo-dados.md (3.3, "products"). current_stock nunca aparece aqui:
// é cache recalculável a partir de stock_movements, nunca editável diretamente
// (fonte de verdade chega na Fase 5 — docs/04-regras-negocio.md, 4.4).
export const createProductSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid().nullish(),
  unit: z.string().trim().min(1).max(16),
  // centavos, nunca float (CLAUDE.md regra 9).
  costPrice: z.number().int().nonnegative(),
  salePrice: z.number().int().nonnegative(),
  minimumStock: z.number().nonnegative().nullish(),
  maximumStock: z.number().nonnegative().nullish(),
  supplierId: z.string().uuid().nullish(),
  isActive: z.boolean().optional(),
});
export const updateProductSchema = createProductSchema.partial();
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// docs/04-regras-negocio.md (4.4). VENDA/COMPRA de fora de propósito: são
// geradas pelos fluxos de Vendas (Fase 6) e Compras (fase futura, ainda sem
// entidade de pedido de compra), nunca criadas manualmente por este endpoint.
// AJUSTE também fica de fora — tem endpoint dedicado (reconciliação), que
// calcula a diferença em vez de receber uma quantidade solta.
// operationId gerado no cliente, na criação — nunca no envio (CLAUDE.md regra 2,
// docs/07-sync-engine.md, 7.2).
export const createStockMovementSchema = z.object({
  operationId: z.string().uuid(),
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  type: z.enum(["ENTRADA", "SAIDA", "DEVOLUCAO", "TRANSFERENCIA"]),
  // magnitude, sempre positiva — o efeito (+/-) é decidido pelo type, no servidor.
  quantity: z.number().positive(),
  reason: z.string().trim().min(1).max(500),
});
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;

// docs/04-regras-negocio.md (4.4, "Reconciliação de estoque"): compara
// current_stock com a contagem física informada e gera um AJUSTE com a
// diferença — o caller nunca envia a diferença já calculada.
export const reconcileStockSchema = z.object({
  operationId: z.string().uuid(),
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  countedQuantity: z.number().nonnegative(),
  reason: z.string().trim().min(1).max(500),
});
export type ReconcileStockInput = z.infer<typeof reconcileStockSchema>;

// docs/04-regras-negocio.md (4.2). Venda é criada já completa (itens +
// pagamentos) numa só chamada — não existe fluxo de carrinho em rascunho
// nesta fase. O total de payments precisa bater exatamente com o total da
// venda (validado na camada de aplicação, não aqui). operationId gerado no
// cliente, na criação (CLAUDE.md regra 2).
export const createSaleSchema = z.object({
  operationId: z.string().uuid(),
  branchId: z.string().uuid(),
  deviceId: z.string().uuid(),
  cashRegisterId: z.string().uuid(),
  customerId: z.string().uuid().nullish(),
  discountAmount: z.number().int().nonnegative().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().positive(),
        unitPrice: z.number().int().nonnegative(),
        discount: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1),
  payments: z
    .array(
      z.object({
        method: z.enum(PAYMENT_METHODS),
        amount: z.number().int().positive(),
      }),
    )
    .min(1),
});
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

// docs/04-regras-negocio.md (4.3). "reason" é obrigatório (a doc exige
// "motivo obrigatório" na auditoria do cancelamento).
export const cancelSaleSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;

// docs/04-regras-negocio.md (4.5). Abertura de caixa exige valor informado;
// operationId gerado no cliente (CashRegister.operation_id é obrigatório
// desde a Fase 1, igual stock_movements).
export const openCashRegisterSchema = z.object({
  operationId: z.string().uuid(),
  branchId: z.string().uuid(),
  openingAmount: z.number().int().nonnegative(),
});
export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;

export const closeCashRegisterSchema = z.object({
  closingAmount: z.number().int().nonnegative(),
});
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;

// docs/04-regras-negocio.md (4.6). Sem hierarquia (diferente de product
// categories) — o blueprint não pede isso pra finance_categories.
export const createFinanceCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  kind: z.enum(FINANCE_CATEGORY_KINDS),
});
export type CreateFinanceCategoryInput = z.infer<typeof createFinanceCategorySchema>;

// docs/04-regras-negocio.md (4.6): "lançamentos independentes de venda".
// operation_id opcional (schema, Fase 1) — igual Produtos (Fase 4), esta fase
// é online-only, sem fila de sync ainda (Fase 9).
export const createFinanceEntrySchema = z.object({
  type: z.enum(FINANCE_ENTRY_TYPES),
  categoryId: z.string().uuid(),
  description: z.string().trim().min(1).max(300),
  amount: z.number().int().positive(),
  dueDate: z.coerce.date(),
  referenceId: z.string().uuid().nullish(),
});
export const updateFinanceEntrySchema = createFinanceEntrySchema.partial();
export type CreateFinanceEntryInput = z.infer<typeof createFinanceEntrySchema>;
export type UpdateFinanceEntryInput = z.infer<typeof updateFinanceEntrySchema>;

export const markFinanceEntryPaidSchema = z.object({
  paidAt: z.coerce.date().optional(), // default: agora, decidido no servidor
});
export type MarkFinanceEntryPaidInput = z.infer<typeof markFinanceEntryPaidSchema>;

// docs/09-api.md (9.4): GET /finance/cash-flow?from=&to=, GET /finance/dre?from=&to=.
export const financePeriodQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
export type FinancePeriodQuery = z.infer<typeof financePeriodQuerySchema>;

// docs/09-api.md (9.5) — contrato de POST /sync/batch. Cada operação do lote
// é processada individualmente e transacionalmente (uma rejeitada não trava
// as outras) — por isso "payload" não é validado com o schema específico
// aqui, isso acontece por operação dentro do dispatcher (uma operação com
// payload malformado vira REJECTED, não derruba o lote inteiro com 400).
export const SYNC_ENTITIES = [
  "SALE_CREATED",
  "SALE_CANCELLED",
  "STOCK_MOVEMENT_CREATED",
  "STOCK_RECONCILED",
  "CASH_REGISTER_OPENED",
  "CASH_REGISTER_CLOSED",
] as const;
export type SyncEntity = (typeof SYNC_ENTITIES)[number];

export const syncBatchSchema = z.object({
  deviceId: z.string().uuid(),
  operations: z
    .array(
      z.object({
        operationId: z.string().uuid(),
        entity: z.enum(SYNC_ENTITIES),
        payload: z.record(z.unknown()),
        createdAt: z.coerce.date(),
      }),
    )
    .min(1)
    .max(100),
});
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;

// docs/05-permissoes-rbac.md (5.8): mudança de role é auditada. OWNER é
// "não removível/limitável" (5.2) — o backend (não este schema) rejeita
// trocar o role de um usuário que hoje é OWNER.
export const updateUserRoleSchema = z.object({
  role: z.enum(ROLES),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
