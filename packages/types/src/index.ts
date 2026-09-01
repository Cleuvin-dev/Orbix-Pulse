// Entidades e tipos de domínio compartilhados são adicionados conforme as fases de negócio
// (ver docs/12-roadmap-fases.md).
export {
  FINANCE_ENTRY_STATUSES,
  FINANCE_ENTRY_TYPES,
  type FinanceEntryStatus,
  type FinanceEntryType,
} from "./finance-entry";
export { PAYMENT_METHODS, type PaymentMethod } from "./payment-method";
export { ROLES, type Role } from "./role";
export { STOCK_MOVEMENT_TYPES, type StockMovementType } from "./stock-movement-type";
