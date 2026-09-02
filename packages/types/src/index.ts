// Entidades e tipos de domínio compartilhados são adicionados conforme as fases de negócio
// (ver docs/12-roadmap-fases.md).
//
// Tudo num arquivo só de propósito: um import relativo entre arquivos deste
// pacote (ex: "./role") sem extensão quebra em runtime dentro do apps/api
// (nest start), porque o Node detecta sintaxe ESM (export ... from) e usa o
// resolvedor estrito, que exige extensão de arquivo — mesmo sem
// "type": "module" no package.json. Isso só importa quando algo importa um
// valor de verdade daqui (não `import type`, que é apagado em tempo de
// compilação e nunca vira um require() real).

// Espelha os enums de apps/api/prisma/schema.prisma (docs/03-modelo-dados.md, 3.3 — barcodes).
export const BARCODE_TYPES = ["EAN13", "EAN8", "UPC", "CODE128", "QR"] as const;
export type BarcodeType = (typeof BARCODE_TYPES)[number];

// Espelha os enums de apps/api/prisma/schema.prisma (docs/03-modelo-dados.md, 3.3 — finance_entries).
export const FINANCE_ENTRY_TYPES = ["PAYABLE", "RECEIVABLE"] as const;
export type FinanceEntryType = (typeof FINANCE_ENTRY_TYPES)[number];

export const FINANCE_ENTRY_STATUSES = ["PENDING", "PAID", "OVERDUE", "CANCELLED"] as const;
export type FinanceEntryStatus = (typeof FINANCE_ENTRY_STATUSES)[number];

// Espelha os enums de apps/api/prisma/schema.prisma (docs/03-modelo-dados.md, 3.3 — fiscal_documents / docs/08-fiscal.md).
export const FISCAL_DOCUMENT_TYPES = ["NFE", "NFCE", "NFSE"] as const;
export type FiscalDocumentType = (typeof FISCAL_DOCUMENT_TYPES)[number];

export const FISCAL_DOCUMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "AUTHORIZED",
  "REJECTED",
  "CANCELLED",
] as const;
export type FiscalDocumentStatus = (typeof FISCAL_DOCUMENT_STATUSES)[number];

// Espelha o enum PaymentMethod de apps/api/prisma/schema.prisma (docs/03-modelo-dados.md, 3.3 — payments).
export const PAYMENT_METHODS = ["CASH", "CARD", "PIX", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Espelha o enum Role de apps/api/prisma/schema.prisma (docs/05-permissoes-rbac.md, 5.2).
// Mantido em sincronia manualmente até existir geração automática de tipos a partir do schema.
export const ROLES = ["OWNER", "ADMIN", "MANAGER", "FINANCE", "CASHIER", "STOCK", "SELLER", "ACCOUNTANT"] as const;
export type Role = (typeof ROLES)[number];

// Espelha o enum StockMovementType de apps/api/prisma/schema.prisma (docs/03-modelo-dados.md, 3.3 — stock_movements).
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

// Identidade resolvida pelo backend a partir do JWT do Supabase (docs/09-api.md, 9.2).
// Formato de resposta de GET /v1/auth/me — nunca inclui permissões cruas do
// cliente, tenant_id/role sempre vêm do banco (docs/02-arquitetura.md, 2.6).
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  tenantName: string;
  role: Role;
}
