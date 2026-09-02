import { Controller, Get, UseGuards } from "@nestjs/common";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { BranchesService } from "../../application/branches/branches.service";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

// Sem permissão dedicada de filial em docs/05-permissoes-rbac.md (5.4) — lista
// de filiais é pré-requisito de leitura pra Estoque/Vendas (precisam de
// branchId), então reaproveita products.view, mesmo padrão de
// product-categories/stock alerts. Lacuna sinalizada em docs/12-roadmap-fases.md.
@Controller("branches")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @RequirePermission("products.view")
  list(@CurrentUser() user: CurrentUserType) {
    return this.branches.list(user.tenantId);
  }
}
