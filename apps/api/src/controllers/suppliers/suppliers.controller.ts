import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { CreateSupplierInput, UpdateSupplierInput } from "@orbix/validation";
import { createSupplierSchema, updateSupplierSchema } from "@orbix/validation";
import type { CurrentUser as CurrentUserType } from "@orbix/types";

import { SuppliersService } from "../../application/suppliers/suppliers.service";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { CurrentUser } from "../auth/current-user.decorator";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { PermissionGuard } from "../permissions/permission.guard";
import { RequirePermission } from "../permissions/require-permission.decorator";

// Sem permissão dedicada de fornecedor em docs/05-permissoes-rbac.md (5.4) —
// reaproveita products.view/update/delete, mesmo padrão de product-categories
// (Fase 4): fornecedor é referenciado por products.supplier_id, mesmo domínio
// de catálogo. Lacuna sinalizada em docs/12-roadmap-fases.md.
@Controller("suppliers")
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @RequirePermission("products.view")
  list(@CurrentUser() user: CurrentUserType) {
    return this.suppliers.list(user.tenantId);
  }

  @Post()
  @RequirePermission("products.update")
  create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierInput,
  ) {
    return this.suppliers.create(user.tenantId, user.id, body);
  }

  @Patch(":id")
  @RequirePermission("products.update")
  update(
    @CurrentUser() user: CurrentUserType,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateSupplierSchema)) body: UpdateSupplierInput,
  ) {
    return this.suppliers.update(user.tenantId, id, body);
  }

  @Delete(":id")
  @RequirePermission("products.delete")
  remove(@CurrentUser() user: CurrentUserType, @Param("id") id: string) {
    return this.suppliers.remove(user.tenantId, id);
  }
}
