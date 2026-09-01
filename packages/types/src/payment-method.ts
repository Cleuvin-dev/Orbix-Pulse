// Espelha o enum PaymentMethod de apps/api/prisma/schema.prisma
// (docs/03-modelo-dados.md, 3.3 — payments).
export const PAYMENT_METHODS = ["CASH", "CARD", "PIX", "OTHER"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
