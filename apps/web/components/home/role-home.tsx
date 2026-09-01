"use client";

import type { Role } from "@orbix/types";

import { useDevSession } from "@/lib/dev-session";

import { ExecutiveDashboard } from "./executive-dashboard";
import { FinanceHome } from "./finance-home";
import { OperationalDashboard } from "./operational-dashboard";
import { PdvHome } from "./pdv-home";
import { StockHome } from "./stock-home";

// Home por papel (docs/05-permissoes-rbac.md, 5.6).
const HOME_BY_ROLE: Record<Role, () => React.JSX.Element> = {
  OWNER: ExecutiveDashboard,
  ADMIN: ExecutiveDashboard,
  MANAGER: OperationalDashboard,
  FINANCE: FinanceHome,
  ACCOUNTANT: FinanceHome,
  CASHIER: PdvHome,
  SELLER: PdvHome,
  STOCK: StockHome,
};

export function RoleHome() {
  const { user } = useDevSession();
  const Home = HOME_BY_ROLE[user.role];
  return <Home />;
}
