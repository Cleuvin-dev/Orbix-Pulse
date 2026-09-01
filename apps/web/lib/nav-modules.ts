import type { Role } from "@orbix/types";
import {
  BarChart3,
  Boxes,
  FileStack,
  LayoutDashboard,
  Receipt,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

// Módulos de docs/01-visao-produto.md (1.4). A lista de `roles` controla apenas
// o que aparece no menu — é conveniência de UX, não autorização (docs/04-regras-negocio.md,
// 4.7): a verificação de verdade é sempre no backend (CanPerform, Fase 3).
export interface NavModule {
  key: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

export const NAV_MODULES: NavModule[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["OWNER", "ADMIN", "MANAGER", "FINANCE", "STOCK", "ACCOUNTANT"],
  },
  {
    key: "vendas",
    label: "Vendas",
    href: "/vendas",
    icon: ShoppingCart,
    roles: ["OWNER", "ADMIN", "MANAGER", "CASHIER", "SELLER"],
  },
  {
    key: "produtos",
    label: "Produtos",
    href: "/produtos",
    icon: FileStack,
    roles: ["OWNER", "ADMIN", "MANAGER", "STOCK", "SELLER", "FINANCE"],
  },
  {
    key: "estoque",
    label: "Estoque",
    href: "/estoque",
    icon: Boxes,
    roles: ["OWNER", "ADMIN", "MANAGER", "STOCK"],
  },
  {
    key: "compras",
    label: "Compras",
    href: "/compras",
    icon: Truck,
    roles: ["OWNER", "ADMIN", "MANAGER", "STOCK"],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    href: "/financeiro",
    icon: Wallet,
    roles: ["OWNER", "ADMIN", "MANAGER", "FINANCE", "ACCOUNTANT"],
  },
  {
    key: "fiscal",
    label: "Fiscal",
    href: "/fiscal",
    icon: Receipt,
    roles: ["OWNER", "ADMIN", "MANAGER", "ACCOUNTANT"],
  },
  {
    key: "relatorios",
    label: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    roles: ["OWNER", "ADMIN", "MANAGER", "FINANCE", "ACCOUNTANT"],
  },
  {
    key: "usuarios",
    label: "Usuários e Permissões",
    href: "/usuarios",
    icon: Users,
    roles: ["OWNER", "ADMIN"],
  },
];

export function navModulesForRole(role: Role): NavModule[] {
  return NAV_MODULES.filter((module) => module.roles.includes(role));
}
