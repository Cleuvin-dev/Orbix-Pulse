import type { Role } from "@prisma/client";

// Transcrição literal da matriz de docs/05-permissoes-rbac.md (5.4) — usada
// como seed inicial de role_permissions por tenant (cada tenant pode
// customizar depois, isso aqui não é lido em runtime pelo CanPerformService).
//
// Duas simplificações deliberadas, sinalizadas aqui por não estarem resolvidas
// no blueprint ainda:
// - "política*" (sales.cancel/fiscal.cancel para MANAGER): a doc define isso
//   como "configurável por tenant (ex: até X horas após a venda)", que é uma
//   regra de negócio contextual (precisa da venda em mãos), não uma permissão
//   binária. CanPerform só resolve o binário; por ora MANAGER recebe a
//   permissão concedida, e a janela de tempo fica para quando o domínio de
//   Vendas existir (Fase 4+) e puder aplicar a política de verdade.
// - "limitado**" (finance.view para CASHIER): é um filtro de dado (só a
//   sessão de caixa aberta do próprio usuário), não uma negação de acesso à
//   rota. CASHIER recebe a permissão concedida; o filtro de linhas é
//   responsabilidade da consulta financeira quando ela existir (Fase 5+).
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  OWNER: [
    "sales.create",
    "sales.cancel",
    "products.view",
    "products.update",
    "products.delete",
    "stock.movement.create",
    "stock.adjust",
    "cash_register.open_close",
    "finance.view",
    "finance.view_profit",
    "finance.export",
    "reports.executive.view",
    "fiscal.issue",
    "fiscal.cancel",
    "users.manage",
    "settings.manage",
    "audit.view",
  ],
  ADMIN: [
    "sales.create",
    "sales.cancel",
    "products.view",
    "products.update",
    "products.delete",
    "stock.movement.create",
    "stock.adjust",
    "cash_register.open_close",
    "finance.view",
    "finance.view_profit",
    "finance.export",
    "reports.executive.view",
    "fiscal.issue",
    "fiscal.cancel",
    "users.manage",
    "settings.manage",
    "audit.view",
  ],
  MANAGER: [
    "sales.create",
    "sales.cancel", // política* — ver comentário acima
    "products.view",
    "products.update",
    "stock.movement.create",
    "stock.adjust",
    "cash_register.open_close",
    "finance.view",
    "finance.view_profit",
    "finance.export",
    "reports.executive.view",
    "fiscal.issue",
    "fiscal.cancel", // política* — ver comentário acima
  ],
  FINANCE: ["products.view", "finance.view", "finance.view_profit", "finance.export"],
  CASHIER: [
    "sales.create",
    "products.view",
    "cash_register.open_close",
    "finance.view", // limitado** — ver comentário acima
  ],
  STOCK: ["products.view", "stock.movement.create", "stock.adjust"],
  SELLER: ["sales.create", "products.view"],
  ACCOUNTANT: ["finance.view", "finance.export"],
};
