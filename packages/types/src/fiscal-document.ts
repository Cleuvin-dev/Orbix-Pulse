// Espelha os enums de apps/api/prisma/schema.prisma (docs/03-modelo-dados.md,
// 3.3 — fiscal_documents / docs/08-fiscal.md).
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
