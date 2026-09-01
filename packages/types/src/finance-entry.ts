// Espelha os enums de apps/api/prisma/schema.prisma (docs/03-modelo-dados.md,
// 3.3 — finance_entries).
export const FINANCE_ENTRY_TYPES = ["PAYABLE", "RECEIVABLE"] as const;
export type FinanceEntryType = (typeof FINANCE_ENTRY_TYPES)[number];

export const FINANCE_ENTRY_STATUSES = ["PENDING", "PAID", "OVERDUE", "CANCELLED"] as const;
export type FinanceEntryStatus = (typeof FINANCE_ENTRY_STATUSES)[number];
